import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Category, TransactionType } from '../types';
import { formatNumberWithDots, parseCurrencyInput, getTodayString } from '../utils/formatters';
import { CategoryManagerModal } from '../components/categories/CategoryManagerModal';
import { Check, Loader2, ArrowLeft, Settings2 } from 'lucide-react';

export const AddTransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [memberId, setMemberId] = useState<string>(() => {
    return localStorage.getItem('last_selected_member') || 'husband';
  });
  const [date, setDate] = useState<string>(getTodayString());
  const [note, setNote] = useState<string>('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Category modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  const loadCategories = async () => {
    try {
      const list = await api.getCategories();
      setCategories(list);
      const filtered = list.filter((c) => c.type === type && c.active);
      if (filtered.length > 0) {
        setCategoryId(filtered[0].id);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [type]);

  // Auto-focus amount input on page load
  useEffect(() => {
    if (amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseCurrencyInput(raw);
    if (num === 0 && raw === '') {
      setAmountStr('');
    } else {
      setAmountStr(formatNumberWithDots(num));
    }
  };

  const handleQuickAmount = (val: number) => {
    const current = parseCurrencyInput(amountStr);
    setAmountStr(formatNumberWithDots(current + val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseCurrencyInput(amountStr);
    if (parsedAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0');
      amountInputRef.current?.focus();
      return;
    }

    if (!categoryId) {
      setErrorMsg('Vui lòng chọn danh mục');
      return;
    }

    try {
      setSubmitting(true);
      await api.createTransaction({
        date,
        type,
        amount: parsedAmount,
        category_id: categoryId,
        member_id: memberId,
        note: note.trim() || undefined,
      });

      // Remember last selected member
      localStorage.setItem('last_selected_member', memberId);

      setSuccess(true);
      setTimeout(() => {
        navigate('/transactions');
      }, 400);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể lưu giao dịch. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type && c.active);

  return (
    <div className="space-y-4">
      {/* Top back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại</span>
      </button>

      {/* Type Toggle: Chi tiêu vs Thu nhập */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/70 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setType('expense');
            const exp = categories.filter((c) => c.type === 'expense' && c.active);
            if (exp.length > 0) setCategoryId(exp[0].id);
          }}
          className={`py-2.5 rounded-xl font-bold text-sm transition ${
            type === 'expense'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Khoản Chi
        </button>
        <button
          type="button"
          onClick={() => {
            setType('income');
            const inc = categories.filter((c) => c.type === 'income' && c.active);
            if (inc.length > 0) setCategoryId(inc[0].id);
          }}
          className={`py-2.5 rounded-xl font-bold text-sm transition ${
            type === 'income'
              ? 'bg-white text-emerald-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Khoản Thu
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Error message display */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Số tiền (VNĐ)
          </label>
          <div className="relative">
            <input
              ref={amountInputRef}
              type="text"
              inputMode="numeric"
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0"
              className="w-full text-3xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-right pr-12"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
              ₫
            </span>
          </div>

          {/* Quick amount suggestion chips */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1 scrollbar-none">
            {[20000, 50000, 100000, 200000, 500000, 1000000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl whitespace-nowrap transition"
              >
                +{val >= 1000000 ? `${val / 1000000}tr` : `${val / 1000}k`}
              </button>
            ))}
            {amountStr && (
              <button
                type="button"
                onClick={() => setAmountStr('')}
                className="px-2 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 text-xs rounded-xl transition"
              >
                Xóa
              </button>
            )}
          </div>
        </div>

        {/* Member selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Người thực hiện
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMemberId('husband')}
              className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition ${
                memberId === 'husband'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Chồng
            </button>
            <button
              type="button"
              onClick={() => setMemberId('wife')}
              className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition ${
                memberId === 'wife'
                  ? 'bg-pink-50 border-pink-500 text-pink-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Vợ
            </button>
          </div>
        </div>

        {/* Category selection */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Danh mục
            </label>
            <button
              type="button"
              onClick={() => setIsCatModalOpen(true)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Quản lý danh mục</span>
            </button>
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          >
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ngày giao dịch
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {/* Note input (optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ghi chú (không bắt buộc)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Ăn tối, Mua sữa cho con..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white placeholder:text-slate-400"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || success}
          className={`w-full py-3.5 px-4 rounded-2xl font-bold text-white shadow-md flex items-center justify-center gap-2 transition active:scale-[0.99] ${
            type === 'expense'
              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Đang lưu...</span>
            </>
          ) : success ? (
            <>
              <Check className="w-5 h-5" />
              <span>Đã lưu thành công!</span>
            </>
          ) : (
            <span>Lưu {type === 'expense' ? 'Khoản Chi' : 'Khoản Thu'}</span>
          )}
        </button>
      </form>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        categories={categories}
        onCategoriesUpdated={() => loadCategories()}
      />
    </div>
  );
};
