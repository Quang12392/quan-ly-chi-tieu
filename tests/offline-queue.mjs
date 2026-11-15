import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Hàng đợi giao dịch offline: giữ thứ tự, không trùng, dừng khi lỗi, gửi lại cùng mã lệnh.
const output = await build({ entryPoints: ['src/utils/offlineQueue.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const store = new Map();
global.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const q = await import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64'));

const scope = '["https://mock.invalid","wife"]';
const item = (n) => ({ scope, requestId: `request_${String(n).padStart(16, '0')}`, savedAt: Date.now(), payload: { date: '2026-11-15', type: 'expense', amount: n * 1000, category_id: 'food', member_id: 'wife' } });
q.enqueueTransaction(item(1)); q.enqueueTransaction(item(2)); q.enqueueTransaction(item(2)); q.enqueueTransaction(item(3));
q.enqueueTransaction({ ...item(9), scope: '["https://mock.invalid","husband"]' });
assert.deepEqual(q.queuedTransactions(scope).map(i => i.payload.amount), [1000, 2000, 3000], 'Order kept, duplicates ignored, scoped per member');

// Mạng rớt giữa chừng: lệnh đã gửi được xóa, lệnh lỗi và phía sau vẫn giữ nguyên.
const sent = [];
let failAt = 2000;
const send = async (payload, requestId) => { if (payload.amount === failAt) throw new Error('Không có mạng.'); sent.push(requestId); };
let r = await q.flushTransactionQueue(scope, send);
assert.deepEqual(r, { sent: 1, remaining: 2, error: 'Không có mạng.' });
assert.equal(q.queuedTransactions(scope)[0].lastError, 'Không có mạng.');

// Có mạng lại: gửi nốt theo đúng thứ tự, cùng requestId (máy chủ chống ghi trùng theo mã này).
failAt = -1;
r = await q.flushTransactionQueue(scope, send);
assert.deepEqual(r, { sent: 2, remaining: 0 });
assert.deepEqual(sent, [item(1).requestId, item(2).requestId, item(3).requestId]);
assert.equal(q.queuedTransactions('["https://mock.invalid","husband"]').length, 1, 'Other member queue untouched');

// Hai lần gọi gửi cùng lúc không gửi trùng.
q.enqueueTransaction(item(4));
let calls = 0;
const slow = async () => { calls++; await new Promise(res => setTimeout(res, 20)); };
await Promise.all([q.flushTransactionQueue(scope, slow), q.flushTransactionQueue(scope, slow)]);
assert.equal(calls, 1);
store.set('fam_exp_offline_queue_v1', '{broken');
assert.deepEqual(q.queuedTransactions(scope), [], 'Corrupt storage is ignored safely');
console.log('Offline queue passed: order, dedupe, per-member scope, stop-on-error, resume, single flusher.');
