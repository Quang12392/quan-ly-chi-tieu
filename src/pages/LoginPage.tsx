import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Heart, ShieldCheck, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [selectedMember, setSelectedMember] = useState<'husband' | 'wife'>('husband');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pin) {
      setError('Vui lòng nhập mã PIN bảo mật gia đình');
      return;
    }

    const success = login(pin, selectedMember);
    if (success) {
      navigate('/');
    } else {
      setError('Mã PIN bảo mật không chính xác. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-200/80 space-y-5">
        {/* App Logo & Title */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
            <Heart className="w-7 h-7 fill-white" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Sổ Chi Tiêu Gia Đình
          </h2>
          <p className="text-xs text-slate-500">
            Dành riêng cho 2 vợ chồng • Dữ liệu riêng tư
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Bạn là ai?
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMember('husband')}
                className={`py-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  selectedMember === 'husband'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  C
                </div>
                <span>Chồng</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMember('wife')}
                className={`py-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  selectedMember === 'wife'
                    ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center text-xs font-bold">
                  V
                </div>
                <span>Vợ</span>
              </button>
            </div>
          </div>

          {/* Family PIN input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Mã PIN gia đình
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Nhập mã PIN..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center text-lg tracking-widest font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition active:scale-[0.99]"
          >
            <span>Đăng nhập</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bảo mật thiết bị gia đình</span>
        </div>
      </div>
    </div>
  );
};
