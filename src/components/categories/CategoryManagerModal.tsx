import React, { useState } from 'react';
import { Category, TransactionType } from '../../types';
import { api } from '../../api/client';
import { X, Plus, Edit2, Check, Eye, EyeOff } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCategoriesUpdated: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onCategoriesUpdated,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg('');
      await api.createCategory({
        name: newCatName.trim(),
        type: activeTab,
        icon: activeTab === 'expense' ? 'Tag' : 'Coins',
        sort_order: categories.length + 1,
        active: true,
      });
      setNewCatName('');
      onCategoriesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể thêm danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = async (catId: string) => {
    if (!editingName.trim()) return;

    try {
      setSubmitting(true);
      await api.updateCategory(catId, { name: editingName.trim() });
      setEditingId(null);
      onCategoriesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể cập nhật danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      setSubmitting(true);
      await api.updateCategory(cat.id, { active: !cat.active });
      onCategoriesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể thay đổi trạng thái danh mục');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = categories.filter((c) => c.type === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-base">Quản lý danh mục</h3>
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

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'expense'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh mục Chi tiêu
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'income'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh mục Thu nhập
          </button>
        </div>

        {/* Add category form */}
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder={`+ Thêm danh mục ${activeTab === 'expense' ? 'chi' : 'thu'} mới...`}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={submitting || !newCatName.trim()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </form>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
          {filtered.map((cat) => (
            <div key={cat.id} className="py-2.5 flex items-center justify-between gap-2">
              {editingId === cat.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleSaveEdit(cat.id)}
                    className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      cat.active ? 'text-slate-800' : 'text-slate-400 line-through'
                    }`}
                  >
                    {cat.name}
                  </span>
                  {!cat.active && (
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      Đã ẩn
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1">
                {editingId !== cat.id && (
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                    title="Đổi tên"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(cat)}
                  className={`p-1.5 rounded-lg transition ${
                    cat.active
                      ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                  title={cat.active ? 'Ẩn danh mục' : 'Hiện danh mục'}
                >
                  {cat.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
