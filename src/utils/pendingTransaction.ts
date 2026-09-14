import { TransactionType } from '../types';

export interface PendingTransactionPayload {
  date: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  member_id: string;
  account_id?: string;
  note?: string;
}

export interface PendingTransactionWrite {
  scope: string;
  requestId: string;
  payload: PendingTransactionPayload;
  savedAt: number;
}

const PENDING_TRANSACTION_KEY = 'fam_exp_pending_transaction_v1';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;

export function createTransactionRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function validPendingWrite(value: unknown): value is PendingTransactionWrite {
  if (!value || typeof value !== 'object') return false;
  const pending = value as Partial<PendingTransactionWrite>;
  const payload = pending.payload as Partial<PendingTransactionPayload> | undefined;
  return typeof pending.scope === 'string'
    && typeof pending.requestId === 'string'
    && REQUEST_ID_PATTERN.test(pending.requestId)
    && Number.isFinite(pending.savedAt)
    && !!payload
    && /^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ''))
    && (payload.type === 'expense' || payload.type === 'income')
    && Number.isSafeInteger(payload.amount)
    && Number(payload.amount) > 0
    && typeof payload.category_id === 'string'
    && !!payload.category_id
    && typeof payload.member_id === 'string'
    && !!payload.member_id;
}

export function savePendingTransaction(pending: PendingTransactionWrite): void {
  try {
    localStorage.setItem(PENDING_TRANSACTION_KEY, JSON.stringify(pending));
  } catch { /* The in-memory form still retains the safe retry if storage is unavailable. */ }
}

export function readPendingTransaction(scope: string): PendingTransactionWrite | null {
  try {
    const pending: unknown = JSON.parse(localStorage.getItem(PENDING_TRANSACTION_KEY) || 'null');
    return validPendingWrite(pending) && pending.scope === scope ? pending : null;
  } catch { return null; }
}

export function clearPendingTransaction(scope: string, requestId: string): void {
  try {
    const pending: unknown = JSON.parse(localStorage.getItem(PENDING_TRANSACTION_KEY) || 'null');
    if (validPendingWrite(pending) && pending.scope === scope && pending.requestId === requestId) {
      localStorage.removeItem(PENDING_TRANSACTION_KEY);
    }
  } catch { /* A corrupt or unavailable cache does not change the confirmed server result. */ }
}
