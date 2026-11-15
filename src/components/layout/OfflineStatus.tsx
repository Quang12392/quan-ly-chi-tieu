import React, { useCallback, useEffect, useState } from 'react';
import { CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { api, isOffline } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatNumberWithDots } from '../../utils/formatters';
import {
  DATA_SYNCED_EVENT,
  flushTransactionQueue,
  OFFLINE_QUEUE_EVENT,
  QUEUE_FLUSH_EVENT,
  queuedTransactions,
  removeQueuedTransaction,
} from '../../utils/offlineQueue';

// Thanh trạng thái: báo đang offline, số giao dịch chờ gửi, và tự gửi khi có mạng lại.
export const OfflineStatus: React.FC = () => {
  const { currentUser } = useAuth();
  const scope = api.getTransactionWriteScope(currentUser || undefined);
  const [offline, setOffline] = useState(isOffline);
  const [queue, setQueue] = useState(() => queuedTransactions(scope));
  const [syncing, setSyncing] = useState(false);
  const [sentNotice, setSentNotice] = useState('');

  const refresh = useCallback(() => {
    setOffline(isOffline());
    setQueue(queuedTransactions(scope));
  }, [scope]);

  const flush = useCallback(async () => {
    if (!api.isLiveMode() || isOffline() || !queuedTransactions(scope).length) return;
    setSyncing(true);
    // Chỉ báo "đã gửi" khi có giao dịch phải chờ lâu (lúc mất mạng); lưu bình thường thì im lặng.
    const waitedLong = queuedTransactions(scope).some((item) => Date.now() - item.savedAt > 15000);
    try {
      const result = await flushTransactionQueue(scope, (payload, requestId) => api.syncTransaction(payload, requestId));
      if (result.sent > 0) {
        if (waitedLong) setSentNotice(`Đã gửi ${result.sent} giao dịch lên Google Sheets.`);
        // Báo các trang tải lại số liệu mới (giữ nguyên phần đang hiển thị trong lúc tải).
        window.dispatchEvent(new Event(DATA_SYNCED_EVENT));
      }
    } finally {
      setSyncing(false);
      refresh();
    }
  }, [scope, refresh]);

  useEffect(() => {
    refresh();
    void flush();
    const online = () => { refresh(); void flush(); };
    const visible = () => { if (document.visibilityState === 'visible') online(); };
    window.addEventListener('online', online);
    window.addEventListener('offline', refresh);
    const flushNow = () => { void flush(); };
    window.addEventListener(OFFLINE_QUEUE_EVENT, refresh);
    window.addEventListener(QUEUE_FLUSH_EVENT, flushNow);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', refresh);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, refresh);
      window.removeEventListener(QUEUE_FLUSH_EVENT, flushNow);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh, flush]);

  useEffect(() => {
    if (!sentNotice) return;
    const timer = setTimeout(() => setSentNotice(''), 5000);
    return () => clearTimeout(timer);
  }, [sentNotice]);

  const discardFirst = () => {
    const first = queue[0];
    if (!first) return;
    const ok = window.confirm(
      `Bỏ giao dịch ${formatNumberWithDots(first.payload.amount)}đ ngày ${first.payload.date}?\n` +
      `Lỗi: ${first.lastError || 'không rõ'}\nGiao dịch này sẽ không được ghi vào Google Sheets.`,
    );
    if (ok) { removeQueuedTransaction(scope, first.requestId); refresh(); }
  };

  if (!offline && !queue.length && !sentNotice) return null;

  if (!queue.length) {
    return (
      <div className={`mx-4 mt-3 px-3 py-2 rounded-xl text-[11px] font-medium flex items-center gap-2 ${offline ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
        {offline && <CloudOff className="w-3.5 h-3.5 shrink-0" />}
        <span>{offline ? 'Đang không có mạng · đang xem dữ liệu đã lưu trên máy. Vẫn nhập giao dịch được.' : sentNotice}</span>
      </div>
    );
  }

  const error = !offline && !syncing ? queue[0].lastError : undefined;
  return (
    <div className={`mx-4 mt-3 px-3 py-2 rounded-xl text-[11px] font-medium border space-y-1.5 ${syncing && !offline ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
      <div className="flex items-center gap-2">
        {syncing ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" /> : <CloudOff className="w-3.5 h-3.5 shrink-0" />}
        <span className="flex-1">
          {syncing
            ? `Đang gửi ${queue.length} giao dịch lên Google Sheets…`
            : offline
              ? `Đang không có mạng · ${queue.length} giao dịch đã lưu trên máy, sẽ tự gửi khi có mạng.`
              : `${queue.length} giao dịch chưa gửi được.`}
        </span>
        {!offline && !syncing && (
          <button type="button" onClick={() => void flush()} className="shrink-0 flex items-center gap-1 font-semibold text-emerald-700">
            <RefreshCw className="w-3.5 h-3.5" /> Gửi lại
          </button>
        )}
      </div>
      {error && (
        <div className="flex items-start justify-between gap-2 text-amber-700">
          <span>Lỗi: {error}</span>
          <button type="button" onClick={discardFirst} className="shrink-0 font-semibold text-rose-700">Bỏ giao dịch này</button>
        </div>
      )}
    </div>
  );
};
