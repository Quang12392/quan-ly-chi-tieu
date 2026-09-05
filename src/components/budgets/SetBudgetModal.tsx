import React, { useState, useEffect } from 'react';
import { Category, Budget } from '../../types';
import { api } from '../../api/client';
import { formatCurrency, formatNumberWithDots, parseCurrencyInput } from '../../utils/formatters';
import { X, Check, Loader2, Target } from 'lucide-react';

interface SetBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  categories: Category[];
  existingBudgets: Budget[];
  onBudgetSaved: () => void;
}

export const SetBudgetModal: React.FC<SetBudgetModalProps> = ({
  isOpen,
  onClose,
  year,
  month,
  categories,
  existingBudgets,
  onBudgetSaved,
}) => {
  if (!isOpen) return null;

  const expenseCategories = categories.filter((c) => c.type === 'expense' && c.active);
  const [selectedCatId, setSelectedCatId] = useState<string>(
    expenseCategories.length > 0 ? expenseCategories[0].id : ''
  );
  const [amountStr, setAmountStr] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // When selected category changes, pre-fill existing budget if any
  useEffect(() => {
    const existing = existingBudgets.find((b) => b.category_id === selectedCatId);
    if (existing) {
      setAmountStr(formatNumberWithDots(existing.amount));
    } else {
      setAmountStr('');
    }
    setErrorMsg('');
  }, [selectedCatId, existingBudgets]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseCurrencyInput(raw);
    if (num === 0 && raw === '') {
      setAmountStr('');
    } else {
      setAmountStr(formatNumberWithDots(num));
    }
  };

  const handleQuickAdd = (val: number) => {
    const current = parseCurrencyInput(amountStr);
    setAmountStr(formatNumberWithDots(current + val));
  };

  const handleSetAmount = (val: number) => {
    setAmountStr(formatNumberWithDots(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCurrencyInput(amountStr);

    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập ngân sách lớn hơn 0');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg('');
      await api.saveBudget({
        year,
        month,
        category_id: selectedCatId,
        amount,
      });
      onBudgetSaved();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi lưu ngân sách');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-base">Đặt ngân sách chi tiêu</h3>
              <p className="text-[11px] text-slate-400">
                Tháng {month} / {year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Chọn danh mục chi tiêu
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              {expenseCategories.map((c) => {
                const currentBudget = existingBudgets.find((b) => b.category_id === c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {currentBudget ? `(Đã đặt: ${formatCurrency(currentBudget.amount)})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Amount input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">
              Hạn mức ngân sách (VNĐ / tháng)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full text-2xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-right pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                ₫
              </span>
            </div>

            {/* Quick shortcuts */}
            <div className="flex gap-1.5 pt-1 overflow-x-auto pb-1">
              {[1000000, 2000000, 3000000, 5000000, 10000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleSetAmount(val)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl whitespace-nowrap transition"
                >
                  {val >= 1000000 ? `${val / 1000000} triệu` : `${val / 1000}k`}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5 pt-0.5">
              {[500000, 1000000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-medium rounded-lg transition"
                >
                  +{val / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Lưu ngân sách</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
