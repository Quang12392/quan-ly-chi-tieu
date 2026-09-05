import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardSummary, Transaction, Category } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EditTransactionModal } from '../components/transactions/EditTransactionModal';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Users,
  Target
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Date selection
  const now = new Date();
  const currentActualMonth = now.getMonth() + 1;
  const currentActualYear = now.getFullYear();
  const [currentMonth, setCurrentMonth] = useState(currentActualMonth);
  const [currentYear, setCurrentYear] = useState(currentActualYear);

  // Edit modal
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, catList] = await Promise.all([
        api.getDashboardSummary(currentYear, currentMonth),
        api.getCategories(),
      ]);
      setSummary(data);
      setCategories(catList);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, currentYear]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleResetToCurrentMonth = () => {
    setCurrentMonth(currentActualMonth);
    setCurrentYear(currentActualYear);
  };

  const isCurrentMonthView = currentMonth === currentActualMonth && currentYear === currentActualYear;

  const handleSaveTransaction = async (id: string, updated: Partial<Transaction>) => {
    await api.updateTransaction(id, updated);
    await loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    await loadData();
  };

  const getCategoryName = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    return cat ? cat.name : catId;
  };

  return (
    <div className="space-y-4">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Tháng {currentMonth} / {currentYear}</span>
          {isCurrentMonthView && (
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ml-1">
              Hiện tại
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {!isCurrentMonthView && (
            <button
              onClick={handleResetToCurrentMonth}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            >
              Tháng này
            </button>
          )}

          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-14 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
          <p className="text-xs">Đang cập nhật số liệu thu chi...</p>
        </div>
      ) : summary ? (
        <>
          {/* Main Financial Overview Card */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-emerald-200 text-xs font-semibold tracking-wider uppercase">
                  Số dư còn lại
                </span>
                <div className="text-3xl font-black tracking-tight mt-0.5">
                  {formatCurrency(summary.balance)}
                </div>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-200">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            {/* Income & Expense Blocks */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-500/40">
              <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Tổng thu</span>
                </div>
                <div className="text-base font-bold text-white">
                  {formatCurrency(summary.total_income)}
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
                <div className="flex items-center gap-1.5 text-xs text-rose-200 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-300" />
                  <span>Tổng chi</span>
                </div>
                <div className="text-base font-bold text-white">
                  {formatCurrency(summary.total_expense)}
                </div>
              </div>
            </div>

            {/* Savings rate pill */}
            {summary.total_income > 0 && (
              <div className="text-center pt-1 text-[11px] text-emerald-100 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Đang giữ lại <strong>{summary.savings_rate}%</strong> thu nhập trong tháng này</span>
              </div>
            )}
          </div>

          {/* Quick Action Button: Thêm giao dịch */}
          <button
            onClick={() => navigate('/add')}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-emerald-500/30 hover:border-emerald-600 hover:bg-emerald-50/40 text-emerald-700 font-bold rounded-2xl shadow-xs transition active:scale-[0.99]"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Thêm giao dịch thu / chi</span>
          </button>

          {/* Member Spending Comparison (Chồng vs Vợ) */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Chi tiêu theo thành viên</span>
              </div>
              <span className="text-[11px] text-slate-400">Chồng vs Vợ</span>
            </div>

            {summary.total_expense === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">Chưa có khoản chi nào trong tháng</p>
            ) : (
              <div className="space-y-2.5">
                {/* Visual side-by-side bar */}
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${summary.member_breakdown.find((m) => m.member_id === 'husband')?.percentage || 0}%`,
                    }}
                    title="Chồng"
                  />
                  <div
                    className="h-full bg-pink-500 transition-all duration-300"
                    style={{
                      width: `${summary.member_breakdown.find((m) => m.member_id === 'wife')?.percentage || 0}%`,
                    }}
                    title="Vợ"
                  />
                </div>

                {/* Member stats */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {summary.member_breakdown.map((m) => (
                    <div
                      key={m.member_id}
                      className={`p-2.5 rounded-2xl border text-xs ${
                        m.member_id === 'husband'
                          ? 'bg-blue-50/60 border-blue-100'
                          : 'bg-pink-50/60 border-pink-100'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-500 text-[11px] mb-0.5">
                        <span className="font-semibold text-slate-700">{m.member_name}</span>
                        <span className="font-bold">{m.percentage}%</span>
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          m.member_id === 'husband' ? 'text-blue-700' : 'text-pink-700'
                        }`}
                      >
                        {formatCurrency(m.total_expense)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Budget Tracking Summary if budget is set */}
          {summary.budget_summary && summary.budget_summary.total_budget > 0 && (
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 text-xs font-bold">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>Tiến độ ngân sách tháng</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold">
                  {summary.budget_summary.percentage >= 100 ? (
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Vượt ngân sách
                    </span>
                  ) : summary.budget_summary.percentage >= 80 ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Sắp chạm hạn mức
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> An toàn
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    summary.budget_summary.percentage >= 100
                      ? 'bg-rose-500'
                      : summary.budget_summary.percentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(summary.budget_summary.percentage, 100)}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-0.5">
                <span>
                  Đã chi: <strong>{formatCurrency(summary.budget_summary.total_spent)}</strong> ({summary.budget_summary.percentage}%)
                </span>
                <span>
                  Ngân sách: <strong>{formatCurrency(summary.budget_summary.total_budget)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Top 5 Categories Breakdown */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs">Top chi tiêu theo danh mục</h3>
              <span className="text-[11px] text-slate-400">
                {summary.category_breakdown.length} danh mục
              </span>
            </div>

            {summary.category_breakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa có chi tiêu nào trong tháng này</p>
            ) : (
              <div className="space-y-3">
                {summary.category_breakdown.slice(0, 5).map((cat) => (
                  <div key={cat.category_id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700">{cat.category_name}</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(cat.total)}</span>
                        <span className="text-slate-400 ml-1.5">({cat.percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions with direct click to Edit */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-xs">Giao dịch gần đây</h3>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center"
              >
                Xem tất cả
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {summary.recent_transactions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa có giao dịch gần đây</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.recent_transactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setEditingTx(tx)}
                    className="py-2.5 flex items-center justify-between hover:bg-slate-50/80 transition rounded-xl px-2 cursor-pointer active:bg-slate-100"
                    title="Bấm để chỉnh sửa giao dịch này"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {tx.note || getCategoryName(tx.category_id)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDate(tx.date)} · {getCategoryName(tx.category_id)} ·{' '}
                        <span className={tx.member_id === 'husband' ? 'text-blue-600 font-medium' : 'text-pink-600 font-medium'}>
                          {tx.member_id === 'husband' ? 'Chồng' : 'Vợ'}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        tx.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {tx.type === 'expense' ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Edit modal when tapping recent transaction */}
      <EditTransactionModal
        transaction={editingTx}
        categories={categories}
        isOpen={!!editingTx}
        onClose={() => setEditingTx(null)}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
};
