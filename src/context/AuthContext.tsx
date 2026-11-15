import { clearDashboardCache } from '../utils/dashboardCache';
import { api, AUTH_EXPIRED_EVENT } from '../api/client';
import React, { createContext, useContext, useState, useEffect } from 'react';

type MemberId = 'husband' | 'wife';
type AuthResult = { success: boolean; message: string };

interface AuthContextType {
  currentUser: MemberId | null;
  isAuthenticated: boolean;
  login: (pin: string, member: MemberId) => Promise<AuthResult>;
  logout: () => void;
  changePin: (oldPin: string, newPin: string) => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'family_auth_session';
// Bản cũ lưu PIN dạng rõ trên máy; chỉ còn dùng để dọn đi.
const LEGACY_PIN_STORAGE_KEY = 'family_access_pin';

function readStoredMember(): MemberId | null {
  const member = localStorage.getItem(AUTH_STORAGE_KEY);
  if (member !== 'husband' && member !== 'wife') return null;
  // Khi đã kết nối Google Sheets, phải có phiên do máy chủ cấp (sau khi kiểm tra PIN).
  if (api.isLiveMode() && !api.hasAuthToken()) return null;
  return member;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<MemberId | null>(readStoredMember);

  useEffect(() => {
    localStorage.removeItem(LEGACY_PIN_STORAGE_KEY);
    const expired = () => {
      clearDashboardCache();
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setCurrentUser(null);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, expired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, expired);
  }, []);

  const login = async (pin: string, member: MemberId): Promise<AuthResult> => {
    try {
      // Chế độ dùng thử (chưa có URL) chỉ có dữ liệu mẫu trên máy nên không cần PIN.
      if (api.isLiveMode()) await api.login(pin, member);
      clearDashboardCache();
      localStorage.setItem(AUTH_STORAGE_KEY, member);
      setCurrentUser(member);
      return { success: true, message: '' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Không thể đăng nhập' };
    }
  };

  const logout = () => {
    clearDashboardCache();
    api.clearAuthToken();
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const changePin = async (oldPin: string, newPin: string): Promise<AuthResult> => {
    if (!api.isLiveMode()) {
      return { success: false, message: 'Chế độ dùng thử trên máy không có mã PIN. Hãy kết nối Google Sheets trước.' };
    }
    if (!newPin || newPin.length < 6) {
      return { success: false, message: 'Mã PIN mới phải có ít nhất 6 ký tự' };
    }
    try {
      await api.changePin(oldPin, newPin);
      return { success: true, message: 'Đã đổi mã PIN. Máy còn lại cần đăng nhập lại bằng mã PIN mới.' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Không thể đổi mã PIN' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        changePin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
