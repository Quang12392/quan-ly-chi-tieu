import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Plus, PieChart, Settings } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {/* 1. Tổng quan */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Tổng quan</span>
        </NavLink>

        {/* 2. Giao dịch */}
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Giao dịch</span>
        </NavLink>

        {/* 3. Nút Thêm Nổi Bật Ở Giữa */}
        <NavLink
          to="/add"
          className="flex flex-col items-center justify-center -mt-5 group"
          aria-label="Thêm giao dịch mới"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 transition-transform active:scale-95 group-hover:bg-emerald-700 p-3">
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </div>
          <span className="text-[11px] font-medium text-emerald-700 mt-0.5">Thêm</span>
        </NavLink>

        {/* 4. Báo cáo */}
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <PieChart className="w-5 h-5 mb-0.5" />
          <span>Báo cáo</span>
        </NavLink>

        {/* 5. Cài đặt */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 py-1 text-xs font-medium transition-colors ${
              isActive ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Cài đặt</span>
        </NavLink>
      </div>
    </nav>
  );
};
