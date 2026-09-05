import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { CategoryManagerModal } from '../components/categories/CategoryManagerModal';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  Database, 
  Tags, 
  ChevronRight, 
  Lock, 
  LogOut,
  ShieldCheck
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, logout, changePin } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gasUrl, setGasUrl] = useState<string>(() => {
    return localStorage.getItem('fam_exp_api_url') || import.meta.env.VITE_API_URL || '';
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Change PIN state
  const [showPinChange, setShowPinChange] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinResult, setPinResult] = useState<{ success: boolean; message: string } | null>(null);

  // Import state
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadCategories = async () => {
    try {
      const list = await api.getCategories();
      setCategories(list);
    } catch (e) {
      console.error('Failed to load categories in settings', e);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleSaveGasUrl = () => {
    api.setApiUrl(gasUrl.trim());
    setTestResult({
      success: true,
      message: gasUrl.trim()
        ? 'Đã lưu URL kết nối Google Apps Script!'
        : 'Đã chuyển về chế độ lưu trữ Nội bộ trên thiết bị!',
    });
  };

  const handleTestConnection = async () => {
    if (!gasUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Vui lòng dán URL Google Apps Script Web App trước khi kiểm tra.',
      });
      return;
    }

    try {
      setTesting(true);
      setTestResult(null);
      api.setApiUrl(gasUrl.trim());
      const data = await api.getBootstrapData();
      setTestResult({
        success: true,
        message: `Kết nối thành công! Đã tải được ${data.categories.length} danh mục từ Google Sheets.`,
      });
      loadCategories();
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Kết nối thất bại: ' + (err instanceof Error ? err.message : 'Vui lòng kiểm tra lại URL'),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleExportJSON = async () => {
    const data = await api.exportAllData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family_expense_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = async () => {
    const csvContent = await api.exportTransactionsCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const confirmRestore = window.confirm(
        `Tìm thấy file sao lưu chứa ${parsed.transactions?.length || 0} giao dịch, ${
          parsed.categories?.length || 0
        } danh mục. Bạn có muốn khôi phục dữ liệu không?`
      );

      if (!confirmRestore) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const res = await api.importAllDataJSON(parsed);
      setImportResult({
        success: true,
        message: `Đã khôi phục thành công ${res.transactionsCount} giao dịch, ${res.categoriesCount} danh mục, ${res.budgetsCount} ngân sách!`,
      });
      loadCategories();
    } catch (err) {
      setImportResult({
        success: false,
        message: 'Lỗi khi khôi phục: ' + (err instanceof Error ? err.message : 'File không đúng định dạng'),
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = changePin(oldPin, newPin);
    setPinResult(res);
    if (res.success) {
      setOldPin('');
      setNewPin('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Cloud Connection / Google Sheets Setup */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm">Kết nối Google Sheets</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Ứng dụng lưu trữ trực tiếp trên Google Sheets của gia đình bạn thông qua Google Apps Script Web App.
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Web App URL (Google Apps Script)
          </label>
          <input
            type="url"
            value={gasUrl}
            onChange={(e) => setGasUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>

        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleSaveGasUrl}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
          >
            Lưu cấu hình
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Đang thử...' : 'Kiểm tra kết nối'}</span>
          </button>
        </div>
      </div>

      {/* Category Management Entry */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Danh mục thu & chi</h3>
              <p className="text-[11px] text-slate-400">
                {categories.length} danh mục ({categories.filter((c) => c.active).length} đang hoạt động)
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition"
          >
            <span>Quản lý</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Backup and Export Data */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800 text-sm">Sao lưu & Xuất dữ liệu</h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Tải toàn bộ dữ liệu ra file Excel (CSV) hoặc file sao lưu (JSON) để lưu trữ ngoại tuyến hoặc chuyển đổi hệ thống.
        </p>

        {importResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              importResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {importResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{importResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Export CSV for Excel */}
          <button
            onClick={handleExportCSV}
            className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất file Excel (CSV)</span>
          </button>

          {/* Export JSON backup */}
          <button
            onClick={handleExportJSON}
            className="py-2.5 px-3 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Sao lưu (JSON)</span>
          </button>
        </div>

        {/* Hidden file input for restore */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Khôi phục dữ liệu từ file JSON</span>
        </button>
      </div>

      {/* Family Security & PIN */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Bảo mật & Mã PIN</h3>
              <p className="text-[11px] text-slate-400">Khóa truy cập cho thiết bị gia đình</p>
            </div>
          </div>
          <button
            onClick={() => setShowPinChange(!showPinChange)}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            {showPinChange ? 'Đóng' : 'Đổi mã PIN'}
          </button>
        </div>

        {showPinChange && (
          <form onSubmit={handleChangePinSubmit} className="pt-2 border-t border-slate-100 space-y-2.5">
            {pinResult && (
              <div
                className={`p-2.5 rounded-xl text-xs ${
                  pinResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {pinResult.message}
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-600">Mã PIN hiện tại</label>
              <input
                type="password"
                inputMode="numeric"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="Nhập mã PIN cũ..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600">Mã PIN mới (tối thiểu 4 số)</label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Nhập mã PIN mới..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
            >
              Cập nhật mã PIN
            </button>
          </form>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800 text-sm">Thành viên gia đình</h3>
        </div>

        <div className="space-y-2">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                C
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Chồng</div>
                <div className="text-[11px] text-slate-400">
                  {currentUser === 'husband' ? 'Đang đăng nhập' : 'Thành viên'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              Hoạt động
            </span>
          </div>

          <div className="p-3 bg-pink-50/70 border border-pink-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center font-bold text-xs">
                V
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Vợ</div>
                <div className="text-[11px] text-slate-400">
                  {currentUser === 'wife' ? 'Đang đăng nhập' : 'Thành viên'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-medium text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full">
              Hoạt động
            </span>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={() => {
            if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?')) {
              logout();
            }
          }}
          className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất thiết bị</span>
        </button>
      </div>

      {/* App Info */}
      <div className="text-center py-3 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-500">Sổ Chi Tiêu Gia Đình v2.0.0</p>
        <div className="flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>100% Miễn phí trọn đời • Dữ liệu hoàn toàn riêng tư</span>
        </div>
      </div>

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
