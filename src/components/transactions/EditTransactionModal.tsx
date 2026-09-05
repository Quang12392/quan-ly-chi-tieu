import React, { useState, useEffect } from 'react';
import { Transaction, Category, TransactionType } from '../../types';
import { formatNumberWithDots, parseCurrencyInput } from '../../utils/formatters';
import { X, Trash2, Check, Loader2 } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updated: Partial<Transaction>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  categories,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !transaction) return null;

  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amountStr, setAmountStr] = useState<string>(formatNumberWithDots(transaction.amount));
  const [categoryId, setCategoryId] = useState<string>(transaction.category_id);
  const [memberId, setMemberId] = useState<string>(transaction.member_id);
  const [date, setDate] = useState<string>(transaction.date);
  const [note, setNote] = useState<string>(transaction.note || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmountStr(formatNumberWithDots(transaction.amount));
      setCategoryId(transaction.category_id);
      setMemberId(transaction.member_id);
      setDate(transaction.date);
      setNote(transaction.note || '');
      setErrorMsg('');
    }
  }, [transaction]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseCurrencyInput(raw);
    if (num === 0 && raw === '') {
      setAmountStr('');
    } else {
      setAmountStr(formatNumberWithDots(num));
    }
  };

  const handleQuickAdd = (addVal: number) => {
    const current = parseCurrencyInput(amountStr);
    setAmountStr(formatNumberWithDots(current + addVal));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseCurrencyInput(amountStr);
    if (parsedAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền lớn hơn 0');
      return;
    }

    try {
      setSaving(true);
      await onSave(transaction.id, {
        type,
        amount: parsedAmount,
        category_id: categoryId,
        member_id: memberId,
        date,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi cập nhật giao dịch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn giao dịch này?');
    if (!ok) return;

    try {
      setDeleting(true);
      await onDelete(transaction.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi xóa giao dịch');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type && c.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base">Chỉnh sửa giao dịch</h3>
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

        <form onSubmit={handleFormSubmit} className="space-y-3.5">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                const exp = categories.filter((c) => c.type === 'expense' && c.active);
                if (exp.length > 0) setCategoryId(exp[0].id);
              }}
              className={`py-2 rounded-lg text-xs font-bold transition ${
                type === 'expense'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
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
              className={`py-2 rounded-lg text-xs font-bold transition ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Khoản Thu
            </button>
          </div>

          {/* Amount input */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Số tiền (VNĐ)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={amountStr}
                onChange={handleAmountChange}
                className="w-full text-2xl font-extrabold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition text-right pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                ₫
              </span>
            </div>

            {/* Quick adjust chips */}
            <div className="flex gap-1.5 pt-1 overflow-x-auto pb-1">
              {[50000, 100000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded-lg whitespace-nowrap transition"
                >
                  +{val.toLocaleString('vi-VN')}
                </button>
              ))}
            </div>
          </div>

          {/* Member */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Người thực hiện
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMemberId('husband')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
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
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                  memberId === 'wife'
                    ? 'bg-pink-50 border-pink-500 text-pink-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Vợ
              </button>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Danh mục
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ngày
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Note */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ghi chú
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú thêm..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
              title="Xóa giao dịch này"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
