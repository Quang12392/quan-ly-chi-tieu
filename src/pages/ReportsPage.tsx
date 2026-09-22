import { Link, useSearchParams } from 'react-router-dom';
import { PageSnapshot, DASHBOARD_REVISION_KEY, isPreviewFresh } from '../utils/dashboardCache';
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { ReportBundle } from '../types';
import { formatCurrency, formatCompactCurrency } from '../utils/formatters';
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
  const [params] = useSearchParams();
  const requestedYear = Number(params.get('year'));
  const requestedMonth = Number(params.get('month'));
  const [currentMonth, setCurrentMonth] = useState(Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(Number.isInteger(requestedYear) && requestedYear >= 1900 && requestedYear <= 9999 ? requestedYear : now.getFullYear());
  const [trendMonth, setTrendMonth] = useState(currentMonth);
  useEffect(() => { setTrendMonth(currentMonth); }, [currentMonth, currentYear]);
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets'>('overview');

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<PageSnapshot<ReportBundle> | null>(() => api.getCachedReport(currentYear,currentMonth));
  const report = snapshot?.data.summary.year === currentYear && snapshot.data.summary.month === currentMonth ? snapshot.data : null;
  const summary = report?.summary || null;
  const prevSummary = report?.previous || null;
  const budgets = report?.budgets || [];
  const categories = report?.categories || [];
  const yearlyTrend = report?.trend || [];
  const yearTotals = report?.years || [];

  // Set budget modal
  const [budgetCategoryId, setBudgetCategoryId] = useState<string>();
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const [reportError, setReportError] = useState('');
  const requestVersion = useRef(0);
  const refreshing = useRef(false);
  const loadData = async () => {
    const version = ++requestVersion.current;
    refreshing.current = true;
    try {
      setLoading(true);
      setReportError('');
      const fresh = await api.getReportSnapshot(currentYear,currentMonth);
      if (version !== requestVersion.current) return;
      setSnapshot(fresh);
    } catch (err) {
      if (version === requestVersion.current) setReportError(err instanceof Error ? err.message : 'Không thể tải báo cáo');
    } finally {
      if (version === requestVersion.current) { setLoading(false); refreshing.current = false; }
    }
  };
  useEffect(() => {
    const cached = api.getCachedReport(currentYear,currentMonth);
    setSnapshot(cached);
    if (isPreviewFresh(cached?.savedAt)) {
      setLoading(false);
      refreshing.current = false;
    } else {
      void loadData();
    }
    const resume = () => {
      const latest = api.getCachedReport(currentYear,currentMonth);
      if (document.visibilityState === 'visible' && !refreshing.current && !isPreviewFresh(latest?.savedAt)) void loadData();
    };
    const changed = (event: StorageEvent) => { if (event.key === DASHBOARD_REVISION_KEY) { setSnapshot(null); void loadData(); } };
    window.addEventListener('online',resume);
    document.addEventListener('visibilitychange',resume);
    window.addEventListener('storage',changed);
    return () => {
      requestVersion.current++;
      window.removeEventListener('online',resume);
      document.removeEventListener('visibilitychange',resume);
      window.removeEventListener('storage',changed);
    };
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

  // Max value for annual trend chart scaling
  const maxTrendVal = Math.max(
    ...yearlyTrend.map((t) => Math.max(t.income, t.expense)),
    1000000
  );

  // Palette for category visualization
  const CATEGORY_COLORS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4'
  ];

  return (
    <div className="space-y-4">
      {reportError && <div role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">{reportError} <button className="underline" onClick={loadData}>Tải lại</button></div>}
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

      <div role="status" className="flex items-start justify-between gap-2 text-[11px] text-slate-500">
        <div><p>{loading ? (report ? 'Đang cập nhật · đang hiển thị bản đã lưu trên máy' : 'Đang lấy báo cáo mới…') : reportError ? 'Chưa cập nhật được báo cáo.' : 'Đã cập nhật báo cáo'}</p>
          {report && snapshot && <p>Lần cập nhật: {new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',hourCycle:'h23',timeZone:'Asia/Ho_Chi_Minh'}).format(snapshot.savedAt)}</p>}
        </div>
        <button disabled={loading} onClick={loadData} className="text-emerald-700 font-semibold shrink-0 disabled:opacity-50">{loading ? 'Đang tải…' : 'Cập nhật'}</button>
      </div>
      {loading && !report ? (
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

              {/* Annual Trend Visualizer (SVG Line Chart) */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-xs">Xu hướng thu chi năm {currentYear}</h3>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Thu
                    </span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Chi
                    </span>
                  </div>
                </div>

                <div className="relative w-full">
                  <svg viewBox="0 0 360 184" className="block w-full h-auto" role="img" aria-label={`Xu hướng thu chi từ tháng 1 đến tháng 12 năm ${currentYear}`}>
                    <desc>{yearlyTrend.map(item => `${item.label}: Thu ${formatCurrency(item.income)}, Chi ${formatCurrency(item.expense)}`).join('; ')}</desc>
                    {[28,62,96,130,164].map(y => <line key={y} x1="15" x2="345" y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="3 4" />)}
                    <line x1={15+(trendMonth-1)*30} x2={15+(trendMonth-1)*30} y1="20" y2="170" stroke="#94a3b8" strokeDasharray="3 3" />
                    {(['income','expense'] as const).map(series => <g key={series}>
                      <polyline points={yearlyTrend.map(item => `${15+(item.month-1)*30},${164-item[series]/maxTrendVal*136}`).join(' ')} fill="none" stroke={series==='income'?'#059669':'#e11d48'} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={series==='expense'?'5 3':undefined} />
                      {yearlyTrend.map(item => <circle key={item.month} cx={15+(item.month-1)*30} cy={164-item[series]/maxTrendVal*136} r={series==='income'?5:3} fill={item.month===trendMonth?(series==='income'?'#059669':'#e11d48'):'white'} stroke={series==='income'?'#059669':'#e11d48'} strokeWidth="2" />)}
                    </g>)}
                  </svg>
                  <div className="absolute inset-0 grid grid-cols-12">
                    {yearlyTrend.map(item => <button key={item.month} aria-label={`Tháng ${item.month}: Thu ${formatCurrency(item.income)}, Chi ${formatCurrency(item.expense)}`} aria-pressed={trendMonth===item.month} onClick={()=>setTrendMonth(item.month)} className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600" />)}
                  </div>
                </div>
                <div className="grid grid-cols-12 text-center text-[10px] text-slate-500" aria-hidden="true">{yearlyTrend.map(item => <span key={item.month} className={trendMonth===item.month?'font-bold text-emerald-700':''}>{item.label}</span>)}</div>
                <div className="rounded-2xl bg-slate-50 p-3 space-y-2" aria-live="polite">
                  <p className="text-xs text-slate-600 text-center">Tháng {trendMonth}/{currentYear}</p>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div><p className="text-slate-500">Thu</p><p className="font-bold text-emerald-700 break-words">{formatCurrency(yearlyTrend.find(item=>item.month===trendMonth)?.income || 0)}</p></div>
                    <div><p className="text-slate-500">Chi</p><p className="font-bold text-rose-600 break-words">{formatCurrency(yearlyTrend.find(item=>item.month===trendMonth)?.expense || 0)}</p></div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 text-center">Chạm vào chấm hoặc vùng của tháng để xem số thu và chi.</p>
              </div>

              <div className="bg-white rounded-3xl p-4 border border-slate-200/80 space-y-3">
                <h3 className="font-bold text-slate-800 text-xs">So sánh thu chi giữa các năm</h3>
                <p className="text-[11px] text-slate-500">Tổng các giao dịch đã ghi của từng năm. Năm đang diễn ra chưa phải số liệu cả năm hoàn chỉnh.</p>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500"><span>Năm</span><span className="text-right">Thu</span><span className="text-right">Chi</span></div>
                {yearTotals.map(item => <button key={item.year} onClick={() => setCurrentYear(item.year)} className={`w-full text-left border-t border-slate-100 pt-2 space-y-1 ${item.year === currentYear ? 'font-bold' : ''}`}>
                  <div className="grid grid-cols-3 gap-2 text-xs"><span>{item.year}</span><span className="text-emerald-700 text-right" title={formatCurrency(item.income)}>{formatCompactCurrency(item.income)}</span><span className="text-rose-600 text-right" title={formatCurrency(item.expense)}>{formatCompactCurrency(item.expense)}</span></div>
                  <div className="h-1.5 rounded bg-slate-100 overflow-hidden"><div className="h-full bg-rose-400" style={{width: `${item.expense / Math.max(1, ...yearTotals.map(y => y.expense)) * 100}%`}} /></div>
                </button>)}
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
                          <Link key={item.category_id} to={`/reports/categories/${encodeURIComponent(item.category_id)}?year=${currentYear}&month=${currentMonth}`} className="py-2.5 flex items-center justify-between gap-2 text-xs hover:bg-emerald-50 rounded-lg focus-visible:outline-emerald-600" aria-label={`Xem xu hướng ${item.category_name}`} >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold text-slate-800">{item.category_name}</span>
                            </div>
                            <div className="text-right flex items-center gap-1">
                              <span className="font-bold text-slate-900">{formatCurrency(item.total)}</span>
                              <span className="text-slate-400 ml-1.5 font-medium">({item.percentage}%)</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </Link>
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
                onClick={() => { setBudgetCategoryId(undefined); setIsBudgetModalOpen(true); }}
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

                {budgets.some((b) => b.inherited_from) && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl text-emerald-800 text-xs">
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Mỗi danh mục tự dùng hạn mức đã đặt gần nhất. Bấm vào từng danh mục để chỉnh; hạn mức mới tiếp tục áp dụng cho các tháng sau.
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
                        <div key={b.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Chỉnh hạn mức ${cat ? cat.name : b.category_id}`}
                          onClick={() => { setBudgetCategoryId(b.category_id); setIsBudgetModalOpen(true); }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setBudgetCategoryId(b.category_id);
                              setIsBudgetModalOpen(true);
                            }
                          }}
                          className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 cursor-pointer hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
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
        initialCategoryId={budgetCategoryId}
        onBudgetSaved={() => loadData()}
      />
    </div>
  );
};
