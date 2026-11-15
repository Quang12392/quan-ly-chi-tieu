import { PendingTransactionPayload, PendingTransactionWrite, validPendingWrite } from './pendingTransaction';

// Giao dịch nhập lúc mất mạng (hoặc mạng chập chờn) được giữ trên máy và gửi lần lượt khi có mạng.
// Mỗi lệnh có requestId riêng; Apps Script nhận cùng requestId nhiều lần vẫn chỉ ghi một giao dịch.

export interface QueuedTransaction extends PendingTransactionWrite {
  lastError?: string;
}

export interface FlushResult {
  sent: number;
  remaining: number;
  error?: string;
}

const QUEUE_KEY = 'fam_exp_offline_queue_v1';
export const OFFLINE_QUEUE_EVENT = 'fam-offline-queue-changed';

function readAll(): QueuedTransaction[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter(validPendingWrite) as QueuedTransaction[] : [];
  } catch { return []; }
}

function writeAll(items: QueuedTransaction[]): void {
  if (items.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  else localStorage.removeItem(QUEUE_KEY);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
}

export function queuedTransactions(scope: string): QueuedTransaction[] {
  return readAll().filter((item) => item.scope === scope);
}

/** Ném lỗi nếu không lưu được (bộ nhớ đầy / bị chặn) để form không báo nhầm là đã lưu. */
export function enqueueTransaction(item: PendingTransactionWrite): void {
  const items = readAll();
  if (!items.some((queued) => queued.scope === item.scope && queued.requestId === item.requestId)) {
    items.push({ scope: item.scope, requestId: item.requestId, payload: item.payload, savedAt: item.savedAt });
  }
  writeAll(items);
}

export function removeQueuedTransaction(scope: string, requestId: string): void {
  const items = readAll();
  const next = items.filter((item) => !(item.scope === scope && item.requestId === requestId));
  if (next.length !== items.length) writeAll(next);
}

let flushing: Promise<FlushResult> | null = null;

/**
 * Gửi lần lượt theo thứ tự đã nhập. Dừng ở lệnh đầu tiên bị lỗi để giữ đúng thứ tự
 * và không gửi dồn khi mạng còn chập chờn. Mọi lệnh chưa gửi được vẫn nằm trên máy.
 */
export function flushTransactionQueue(
  scope: string,
  send: (payload: PendingTransactionPayload, requestId: string) => Promise<unknown>,
): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    let sent = 0;
    for (const item of queuedTransactions(scope)) {
      try {
        await send(item.payload, item.requestId);
        removeQueuedTransaction(scope, item.requestId);
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không gửi được';
        const items = readAll();
        const target = items.find((queued) => queued.scope === scope && queued.requestId === item.requestId);
        if (target && target.lastError !== message) { target.lastError = message; writeAll(items); }
        return { sent, remaining: queuedTransactions(scope).length, error: message };
      }
    }
    return { sent, remaining: queuedTransactions(scope).length };
  })().finally(() => { flushing = null; });
  return flushing;
}
