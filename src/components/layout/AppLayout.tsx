import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { title: 'Tổng Quan Thu Chi', subtitle: 'Tình hình tài chính trong tháng' };
      case '/transactions':
        return { title: 'Lịch Sử Giao Dịch', subtitle: 'Toàn bộ thu chi của gia đình' };
      case '/add':
        return { title: 'Thêm Giao Dịch Mới', subtitle: 'Ghi nhanh trong vài giây' };
      case '/reports':
        return { title: 'Báo Cáo & Ngân Sách', subtitle: 'Phân tích chi tiêu chi tiết' };
      case '/settings':
        return { title: 'Cài Đặt & Đồng Bộ', subtitle: 'Quản lý tài khoản & Google Sheets' };
      default:
        return { title: 'Sổ Chi Tiêu Gia Đình' };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      {/* Container constrained to max-w-lg for mobile-first app experience */}
      <div className="w-full max-w-lg bg-slate-50 min-h-screen flex flex-col border-x border-slate-200/80 shadow-md relative pb-20">
        <Header title={title} subtitle={subtitle} />
        
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  );
};
