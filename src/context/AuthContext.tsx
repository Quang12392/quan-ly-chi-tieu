import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  currentUser: 'husband' | 'wife' | null;
  isAuthenticated: boolean;
  login: (pin: string, member: 'husband' | 'wife') => boolean;
  logout: () => void;
  changePin: (oldPin: string, newPin: string) => { success: boolean; message: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'family_auth_session';
const PIN_STORAGE_KEY = 'family_access_pin';
const DEFAULT_PIN = '192394'; // Family master PIN

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<'husband' | 'wife' | null>(() => {
    return (localStorage.getItem(AUTH_STORAGE_KEY) as 'husband' | 'wife') || null;
  });

  useEffect(() => {
    const existingPin = localStorage.getItem(PIN_STORAGE_KEY);
    // Tự động nâng cấp mã PIN mặc định cũ (123456) lên mã PIN mới của gia đình
    if (!existingPin || existingPin === '123456') {
      localStorage.setItem(PIN_STORAGE_KEY, DEFAULT_PIN);
    }
  }, []);

  const login = (pin: string, member: 'husband' | 'wife'): boolean => {
    const savedPin = localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
    if (pin === savedPin) {
      setCurrentUser(member);
      localStorage.setItem(AUTH_STORAGE_KEY, member);
      localStorage.setItem('last_selected_member', member);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const changePin = (oldPin: string, newPin: string): { success: boolean; message: string } => {
    const currentPin = localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
    if (oldPin !== currentPin) {
      return { success: false, message: 'Mã PIN hiện tại không chính xác' };
    }
    if (!newPin || newPin.length < 4) {
      return { success: false, message: 'Mã PIN mới phải có ít nhất 4 ký tự' };
    }
    localStorage.setItem(PIN_STORAGE_KEY, newPin);
    return { success: true, message: 'Đã đổi mã PIN gia đình thành công!' };
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
