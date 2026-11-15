import { useEffect, useState } from 'react';
import { OFFLINE_QUEUE_EVENT, PendingTransaction, pendingTransactions } from './offlineQueue';

/** Giao dịch đang chờ gửi cần hiện trên dữ liệu tải lúc `loadedAt`; tự cập nhật khi hàng đợi đổi. */
export function usePendingTransactions(scope: string, loadedAt: number | undefined): PendingTransaction[] {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const changed = () => setVersion((v) => v + 1);
    window.addEventListener(OFFLINE_QUEUE_EVENT, changed);
    return () => window.removeEventListener(OFFLINE_QUEUE_EVENT, changed);
  }, []);
  // version chỉ để đọc lại localStorage mỗi khi hàng đợi thay đổi.
  void version;
  return pendingTransactions(scope, loadedAt);
}
