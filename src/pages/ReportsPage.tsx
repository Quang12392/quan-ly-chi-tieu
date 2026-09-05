import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DashboardSummary, Budget, Category } from '../types';
import { formatCurrency } from '../utils/formatters';
import { SetBudgetModal } from '../components/budgets/SetBudgetModal';
import { 
  PieChart, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Sparkles
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets'>('overview');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<DashboardSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [trend6Months, setTrend6Months] = useState<
    { month: number; year: number; label: string; income: number; expense: number; balance: number }[]
  >([]);

  // Set budget modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // Determine previous month/year
      let prevM = currentMonth - 1;
      let prevY = currentYear;
      if (prevM < 1) {
        prevM = 12;
        prevY = currentYear - 1;
      }

      const [curSum, pSum, bList, catList, trendList] = await Promise.all([
        api.getDashboardSummary(currentYear, currentMonth),
        api.getDashboardSummary(prevY, prevM),
        api.getBudgets(currentYear, currentMonth),
        api.getCategories(),
        api.getMonthlyTrend(currentYear, currentMonth, 6),
      ]);

      setSummary(curSum);
      setPrevSummary(pSum);
      setBudgets(bList);
      setCategories(catList);
      setTrend6Months(trendList);
    } catch (err) {
      console.error('Failed to load reports data', err);
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

  // Month-over-month calculation
  const expenseDiff = (summary?.total_expense || 0) - (prevSummary?.total_expense || 0);
  const expenseDiffPercent = prevSummary && prevSummary.total_expense > 0
    ? Math.round((expenseDiff / prevSummary.total_expense) * 100)
    : 0;

  const incomeDiff = (summary?.total_income || 0) - (prevSummary?.total_income || 0);
  const incomeDiffPercent = prevSummary && prevSummary.total_income > 0
    ? Math.round((incomeDiff / prevSummary.total_income) * 100)
    : 0;

  // Max value for 6-month trend chart scaling
  const maxTrendVal = Math.max(
    ...trend6Months.map((t) => Math.max(t.income, t.expense)),
    1000000
  );

  // Palette for category visualization
  const CATEGORY_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4'
  ];

  return (
    <div className="space-y-4">
      {/* Month Selector Bar */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Tháng {currentMonth} / {currentYear}</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs: Tổng quan Báo cáo vs Quản lý Ngân sách */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Báo Cáo & So Sánh</span>
        </button>
        <button
          onClick={() => setActiveTab('budgets')}
          className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'budgets'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Ngân Sách ({budgets.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="py-14 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
          <p className="text-xs">Đang tải số liệu báo cáo...</p>
        </div>
      ) : summary ? (
        <>
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {/* Month-over-Month Comparison Cards */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>So sánh với tháng trước</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Tháng {currentMonth} vs Tháng {currentMonth === 1 ? 12 : currentMonth - 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Chi tiêu so sánh */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">Chi tiêu tháng này</span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatCurrency(summary.total_expense)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] mt-1.5">
                      {expenseDiff > 0 ? (
                        <span className="text-rose-600 font-semibold flex items-center">
                          <ArrowUpRight className="w-3.5 h-3.5" /> +{formatCurrency(expenseDiff)} ({expenseDiffPercent}%)
                        </span>
                      ) : expenseDiff < 0 ? (
                        <span className="text-emerald-600 font-semibold flex items-center">
                          <ArrowDownRight className="w-3.5 h-3.5" /> -{formatCurrency(Math.abs(expenseDiff))} ({Math.abs(expenseDiffPercent)}%)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Không đổi</span>
                      )}
                    </div>
                  </div>

                  {/* Thu nhập so sánh */}
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">Thu nhập tháng này</span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {formatCurrency(summary.total_income)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] mt-1.5">
                      {incomeDiff > 0 ? (
                        <span className="text-emerald-600 font-semibold flex items-center">
                          <ArrowUpRight className="w-3.5 h-3.5" /> +{formatCurrency(incomeDiff)} ({incomeDiffPercent}%)
                        </span>
                      ) : incomeDiff < 0 ? (
                        <span className="text-rose-600 font-semibold flex items-center">
                          <ArrowDownRight className="w-3.5 h-3.5" /> -{formatCurrency(Math.abs(incomeDiff))} ({Math.abs(incomeDiffPercent)}%)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Không đổi</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6-Month Trend Visualizer (Pure SVG Bar Chart) */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs">Xu hướng thu chi 6 tháng gần nhất</h3>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Thu
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Chi
                    </span>
                  </div>
                </div>

                {/* SVG Bar chart */}
                <div className="h-40 w-full flex items-end justify-between pt-4 pb-1 px-1 border-b border-slate-100">
                  {trend6Months.map((item) => {
                    const incHeight = maxTrendVal > 0 ? (item.income / maxTrendVal) * 110 : 0;
                    const expHeight = maxTrendVal > 0 ? (item.expense / maxTrendVal) * 110 : 0;

                    return (
                      <div key={item.label} className="flex-1 flex flex-col items-center justify-end h-full group">
                        <div className="flex items-end gap-1 mb-1">
                          {/* Income bar */}
                          <div
                            className="w-3 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all duration-300 relative group/inc"
                            style={{ height: `${Math.max(incHeight, 3)}px` }}
                            title={`Thu ${item.label}: ${formatCurrency(item.income)}`}
                          />
                          {/* Expense bar */}
                          <div
                            className="w-3 bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all duration-300 relative group/exp"
                            style={{ height: `${Math.max(expHeight, 3)}px` }}
                            title={`Chi ${item.label}: ${formatCurrency(item.expense)}`}
                          />
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            item.month === currentMonth && item.year === currentYear
                              ? 'text-emerald-700 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Category Breakdown (Donut Bar & List) */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                    <PieChart className="w-4 h-4 text-emerald-600" />
                    <span>Cơ cấu chi tiêu theo danh mục</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Tổng chi: {formatCurrency(summary.total_expense)}
                  </span>
                </div>

                {summary.category_breakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Chưa có giao dịch chi tiêu trong tháng này
                  </p>
                ) : (
                  <>
                    {/* Visual colored multi-segment bar */}
                    <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      {summary.category_breakdown.map((item, idx) => (
                        <div
                          key={item.category_id}
                          className="h-full transition-all duration-300"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                          }}
                          title={`${item.category_name}: ${item.percentage}%`}
                        />
                      ))}
                    </div>

                    {/* Detailed category list */}
                    <div className="divide-y divide-slate-100 pt-1">
                      {summary.category_breakdown.map((item, idx) => {
                        const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                        return (
                          <div key={item.category_id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold text-slate-800">{item.category_name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900">{formatCurrency(item.total)}</span>
                              <span className="text-slate-400 ml-1.5 font-medium">({item.percentage}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Budgets Management Tab */
            <div className="space-y-4">
              {/* Header Action Button */}
              <button
                onClick={() => setIsBudgetModalOpen(true)}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Thiết lập ngân sách danh mục</span>
              </button>

              {/* Budgets List with 3-Level Alerts */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-600" />
                    <span>Hạn mức chi tiêu tháng {currentMonth}/{currentYear}</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {budgets.length} danh mục đã đặt
                  </span>
                </div>

                {budgets[0]?.inherited_from && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl text-emerald-800 text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Tự động kế thừa hạn mức từ <strong>tháng {budgets[0].inherited_from}</strong>. Bấm nút thiết lập ở trên nếu muốn chỉnh sửa riêng cho tháng này.
                    </span>
                  </div>
                )}

                {budgets.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Chưa có ngân sách nào cho tháng này</p>
                    <p className="text-[11px] text-slate-400">
                      Bấm vào nút "Thiết lập ngân sách danh mục" ở trên để đặt hạn mức chi tiêu cho gia đình.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1">
                    {budgets.map((b) => {
                      const cat = categories.find((c) => c.id === b.category_id);
                      const catExpense = summary.category_breakdown.find(
                        (cb) => cb.category_id === b.category_id
                      )?.total || 0;
                      const percent = b.amount > 0 ? Math.round((catExpense / b.amount) * 100) : 0;
                      const isExceeded = percent >= 100;
                      const isWarning = percent >= 80 && percent < 100;

                      return (
                        <div key={b.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">
                              {cat ? cat.name : b.category_id}
                            </span>
                            <div className="flex items-center gap-1 text-[11px]">
                              {isExceeded ? (
                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Vượt định mức ({percent}%)
                                </span>
                              ) : isWarning ? (
                                <span className="text-amber-600 font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> Cảnh báo ({percent}%)
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Bình thường ({percent}%)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isExceeded
                                  ? 'bg-rose-500'
                                  : isWarning
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>

                          {/* Numeric breakdown */}
                          <div className="flex justify-between items-center text-[11px] text-slate-500">
                            <span>
                              Đã dùng: <strong>{formatCurrency(catExpense)}</strong>
                            </span>
                            <span>
                              Hạn mức: <strong>{formatCurrency(b.amount)}</strong>
                            </span>
                            <span className={isExceeded ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                              {isExceeded
                                ? `Vượt ${formatCurrency(catExpense - b.amount)}`
                                : `Còn ${formatCurrency(b.amount - catExpense)}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Set Budget Modal */}
      <SetBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        year={currentYear}
        month={currentMonth}
        categories={categories}
        existingBudgets={budgets}
        onBudgetSaved={() => loadData()}
      />
    </div>
  );
};
