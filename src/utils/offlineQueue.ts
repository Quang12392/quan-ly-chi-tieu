import { PendingTransactionPayload, PendingTransactionWrite, validPendingWrite } from './pendingTransaction';
import { Category, DashboardSummary, Transaction, TransactionQuery } from '../types';

// Mọi giao dịch mới được ghi vào hàng đợi trên máy trước (hiện ngay cho người dùng),
// rồi gửi ngầm lên Google Sheets theo thứ tự. Mỗi lệnh có requestId riêng; Apps Script
// nhận cùng requestId nhiều lần vẫn chỉ ghi một giao dịch (id = 'txr_' + requestId).

export interface QueuedTransaction extends PendingTransactionWrite {
  lastError?: string;
  /** Thời điểm Sheets xác nhận. Giữ thêm một lúc để hiển thị cho tới khi số liệu mới tải về. */
  syncedAt?: number;
}

export interface FlushResult {
  sent: number;
  remaining: number;
  error?: string;
}

const QUEUE_KEY = 'fam_exp_offline_queue_v1';
const KEEP_SYNCED_MS = 10 * 60 * 1000;
export const OFFLINE_QUEUE_EVENT = 'fam-offline-queue-changed';
export const QUEUE_FLUSH_EVENT = 'fam-offline-queue-flush';
/** Phát ra sau khi gửi xong để các trang tải lại số liệu (không xóa phần đang hiển thị). */
export const DATA_SYNCED_EVENT = 'fam-data-synced';

function readAll(): QueuedTransaction[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    const now = Date.now();
    return (stored.filter(validPendingWrite) as QueuedTransaction[])
      .filter((item) => !item.syncedAt || now - item.syncedAt < KEEP_SYNCED_MS);
  } catch { return []; }
}

function writeAll(items: QueuedTransaction[]): void {
  if (items.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  else localStorage.removeItem(QUEUE_KEY);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
}

/** Giao dịch chưa được Sheets xác nhận. */
export function queuedTransactions(scope: string): QueuedTransaction[] {
  return readAll().filter((item) => item.scope === scope && !item.syncedAt);
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

function updateItem(scope: string, requestId: string, change: Partial<QueuedTransaction>): void {
  const items = readAll();
  const target = items.find((item) => item.scope === scope && item.requestId === requestId);
  if (!target) return;
  Object.assign(target, change);
  writeAll(items);
}

/** Yêu cầu gửi ngay (OfflineStatus lắng nghe sự kiện này). */
export function requestQueueFlush(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_FLUSH_EVENT));
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
    const attempted = new Set<string>();
    // Đọc lại hàng đợi mỗi vòng để gửi luôn cả giao dịch vừa nhập thêm trong lúc đang gửi.
    for (;;) {
      const item = queuedTransactions(scope).find((queued) => !attempted.has(queued.requestId));
      if (!item) break;
      attempted.add(item.requestId);
      try {
        await send(item.payload, item.requestId);
        updateItem(scope, item.requestId, { syncedAt: Date.now(), lastError: undefined });
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không gửi được';
        if (item.lastError !== message) updateItem(scope, item.requestId, { lastError: message });
        return { sent, remaining: queuedTransactions(scope).length, error: message };
      }
    }
    return { sent, remaining: queuedTransactions(scope).length };
  })().finally(() => { flushing = null; });
  return flushing;
}

// ---------------------------------------------------------------------------
// Hiển thị giao dịch trong hàng đợi chồng lên dữ liệu đã tải từ Sheets
// ---------------------------------------------------------------------------

export type PendingTransaction = Transaction & { pending: true; pendingError?: string };

/**
 * Giao dịch cần hiện thêm trên dữ liệu tải lúc `loadedAt`: chưa gửi xong, hoặc đã gửi
 * nhưng dữ liệu đang hiển thị được tải trước lúc gửi xong (nên chưa có giao dịch này).
 */
export function pendingTransactions(scope: string, loadedAt: number | undefined): PendingTransaction[] {
  return readAll()
    .filter((item) => item.scope === scope && (!item.syncedAt || !loadedAt || loadedAt < item.syncedAt))
    .map((item) => {
      const created = new Date(item.savedAt).toISOString();
      return {
        id: 'txr_' + item.requestId,
        ...item.payload,
        created_at: created,
        updated_at: created,
        deleted: false,
        pending: true,
        ...(item.lastError && !item.syncedAt ? { pendingError: item.lastError } : {}),
      };
    });
}

export function isPendingTransaction(tx: Transaction): tx is PendingTransaction {
  return (tx as Partial<PendingTransaction>).pending === true;
}

export function matchesTransactionQuery(tx: Transaction, query: TransactionQuery, categories: Category[] = []): boolean {
  if (query.from && tx.date < query.from) return false;
  if (query.through && tx.date > query.through) return false;
  if (query.type && tx.type !== query.type) return false;
  if (query.member_id && tx.member_id !== query.member_id) return false;
  if (query.category_id && tx.category_id !== query.category_id) return false;
  const search = (query.search || '').trim().toLowerCase();
  if (search) {
    const categoryName = categories.find((c) => c.id === tx.category_id)?.name || '';
    if (!`${tx.note || ''} ${categoryName}`.toLowerCase().includes(search)) return false;
  }
  return true;
}

const byNewest = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at);

/** Ghép giao dịch đang chờ vào danh sách (bỏ trùng nếu Sheets đã có cùng id). */
export function mergePending(items: Transaction[], pending: Transaction[]): Transaction[] {
  const ids = new Set(items.map((tx) => tx.id));
  const extra = pending.filter((tx) => !ids.has(tx.id));
  return extra.length ? [...extra, ...items].sort(byNewest) : items;
}

/** Cộng giao dịch đang chờ của đúng tháng vào số liệu tổng quan đã tải. */
export function applyPendingToSummary(summary: DashboardSummary, pending: Transaction[], categories: Category[] = []): DashboardSummary {
  const prefix = `${summary.year}-${String(summary.month).padStart(2, '0')}`;
  const known = new Set(summary.recent_transactions.map((tx) => tx.id));
  const extra = pending.filter((tx) => tx.date.startsWith(prefix) && !known.has(tx.id));
  if (!extra.length) return summary;

  const income = extra.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
  const expense = extra.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  const total_income = summary.total_income + income;
  const total_expense = summary.total_expense + expense;
  const balance = total_income - total_expense;
  const pct = (part: number) => (total_expense > 0 ? Math.round((part / total_expense) * 100) : 0);

  const catTotals = new Map(summary.category_breakdown.map((c) => [c.category_id, { ...c }]));
  for (const tx of extra.filter((t) => t.type === 'expense')) {
    const cat = categories.find((c) => c.id === tx.category_id);
    const row = catTotals.get(tx.category_id) || { category_id: tx.category_id, category_name: cat?.name || tx.category_id, category_icon: cat?.icon || 'Tag', total: 0, percentage: 0 };
    row.total += tx.amount;
    catTotals.set(tx.category_id, row);
  }

  const memberExtra = (id: string) => extra.filter((tx) => tx.type === 'expense' && tx.member_id === id).reduce((sum, tx) => sum + tx.amount, 0);
  const total_budget = summary.budget_summary.total_budget;
  const total_spent = summary.budget_summary.total_spent + expense;

  return {
    ...summary,
    total_income,
    total_expense,
    balance,
    savings_rate: total_income > 0 ? Math.max(0, Math.round((balance / total_income) * 100)) : 0,
    category_breakdown: [...catTotals.values()].map((c) => ({ ...c, percentage: pct(c.total) })).sort((a, b) => b.total - a.total),
    member_breakdown: summary.member_breakdown.map((m) => {
      const total = m.total_expense + memberExtra(m.member_id);
      return { ...m, total_expense: total, percentage: pct(total) };
    }),
    budget_summary: {
      total_budget,
      total_spent,
      remaining: Math.max(0, total_budget - total_spent),
      percentage: total_budget > 0 ? Math.round((total_spent / total_budget) * 100) : 0,
    },
    recent_transactions: [...extra, ...summary.recent_transactions].sort(byNewest).slice(0, 10),
  };
}
