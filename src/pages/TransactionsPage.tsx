import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Transaction, Category, TransactionType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { EditTransactionModal } from '../components/transactions/EditTransactionModal';
import { 
  Search, 
  Loader2, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Month navigation
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [allTime, setAllTime] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchNote, setSearchNote] = useState<string>('');

  // Editing state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txList, catList] = await Promise.all([
        api.getTransactions(),
        api.getCategories(),
      ]);
      setTransactions(txList);
      setCategories(catList);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveTransaction = async (id: string, updated: Partial<Transaction>) => {
    await api.updateTransaction(id, updated);
    await loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const getCategory = (catId: string) => {
    return categories.find((c) => c.id === catId);
  };

  // Filter transactions
  const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const filtered = transactions.filter((tx) => {
    if (!allTime && !tx.date.startsWith(monthPrefix)) return false;
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (selectedMember !== 'all' && tx.member_id !== selectedMember) return false;
    if (selectedCategory !== 'all' && tx.category_id !== selectedCategory) return false;
    if (searchNote.trim()) {
      const q = searchNote.toLowerCase().trim();
      const noteMatch = tx.note?.toLowerCase().includes(q);
      const catMatch = getCategory(tx.category_id)?.name.toLowerCase().includes(q);
      if (!noteMatch && !catMatch) return false;
    }
    return true;
  });

  // Calculate totals for currently filtered view
  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Group by date
  const groupedByDate: Record<string, Transaction[]> = {};
  filtered.forEach((tx) => {
    if (!groupedByDate[tx.date]) groupedByDate[tx.date] = [];
    groupedByDate[tx.date].push(tx);
  });

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setAllTime(false);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setAllTime(false);
  };

  return (
    <div className="space-y-4">
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">
            {allTime ? 'Tất cả thời gian' : `Tháng ${selectedMonth}/${selectedYear}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {!allTime && (
            <>
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
            </>
          )}
          <button
            onClick={() => setAllTime(!allTime)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
              allTime
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {allTime ? 'Xem theo tháng' : 'Tất cả'}
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        {/* Search note box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchNote}
            onChange={(e) => setSearchNote(e.target.value)}
            placeholder="Tìm kiếm theo ghi chú, danh mục..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* Type toggle */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterType('all')}
            className={`py-1.5 text-xs font-medium rounded-lg transition ${
              filterType === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`py-1.5 text-xs font-medium rounded-lg transition ${
              filterType === 'expense' ? 'bg-white text-rose-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Khoản chi
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`py-1.5 text-xs font-medium rounded-lg transition ${
              filterType === 'income' ? 'bg-white text-emerald-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Khoản thu
          </button>
        </div>

        {/* Member and Category filters */}
        <div className="grid grid-cols-2 gap-2">
          {/* Member */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Thành viên
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Cả 2 vợ chồng</option>
              <option value="husband">Chồng</option>
              <option value="wife">Vợ</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Danh mục
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'expense' ? 'Chi' : 'Thu'})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Banner for filtered transactions */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-emerald-700 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Thu</span>
          </div>
          <span className="font-bold text-emerald-800">{formatCurrency(totalIncome)}</span>
        </div>

        <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-rose-700 font-medium">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Chi</span>
          </div>
          <span className="font-bold text-rose-800">{formatCurrency(totalExpense)}</span>
        </div>
      </div>

      {/* Transaction List grouped by date */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-600" />
          <p className="text-sm">Đang tải danh sách giao dịch...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs">
          <p className="text-slate-600 text-sm font-semibold">Không có giao dịch nào</p>
          <p className="text-slate-400 text-xs mt-1">
            Không tìm thấy giao dịch nào phù hợp với bộ lọc đã chọn.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map((dateStr) => {
            const dayTxs = groupedByDate[dateStr];
            const dayExpense = dayTxs
              .filter((t) => t.type === 'expense')
              .reduce((sum, t) => sum + t.amount, 0);

            return (
              <div key={dateStr} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
                {/* Date header */}
                <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(dateStr)}</span>
                  </div>
                  {dayExpense > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500">
                      Chi: {formatCurrency(dayExpense)}
                    </span>
                  )}
                </div>

                {/* Day transactions */}
                <div className="divide-y divide-slate-100">
                  {dayTxs.map((tx) => {
                    const cat = getCategory(tx.category_id);
                    return (
                      <div
                        key={tx.id}
                        onClick={() => setEditingTx(tx)}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition cursor-pointer active:bg-slate-100"
                        title="Bấm để xem và sửa giao dịch"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                              tx.type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {tx.type === 'expense' ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowDownLeft className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {tx.note || (cat ? cat.name : 'Giao dịch')}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              <span className="text-slate-600 font-medium">
                                {cat ? cat.name : tx.category_id}
                              </span>
                              <span>•</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[11px] font-medium ${
                                  tx.member_id === 'husband'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-pink-50 text-pink-700'
                                }`}
                              >
                                {tx.member_id === 'husband' ? 'Chồng' : 'Vợ'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`text-sm font-bold text-right ${
                            tx.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {tx.type === 'expense' ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Transaction Modal */}
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
