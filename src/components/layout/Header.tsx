import React from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Cloud, HardDrive, LogOut } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Sổ Chi Tiêu Gia Đình', subtitle }) => {
  const isLive = api.isLiveMode();
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm('Bạn có muốn đăng xuất khỏi sổ chi tiêu?')) {
      logout();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 shadow-xs">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Member Badge */}
          {currentUser && (
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                currentUser === 'husband'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-pink-50 text-pink-700 border border-pink-200'
              }`}
            >
              {currentUser === 'husband' ? 'Chồng' : 'Vợ'}
            </span>
          )}

          {/* Cloud/Local status */}
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Cloud className="w-3 h-3 text-emerald-600" />
              Sheet
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"
              title="Đang lưu nội bộ trên máy."
            >
              <HardDrive className="w-3 h-3 text-amber-600" />
              Nội bộ
            </span>
          )}

          {/* Logout Button */}
          {currentUser && (
            <button
              onClick={handleLogout}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
