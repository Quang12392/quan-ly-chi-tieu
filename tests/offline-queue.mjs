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
// Hiển thị: giao dịch đã gửi vẫn hiện cho tới khi dữ liệu mới (tải sau lúc gửi xong) về.
store.clear();
q.enqueueTransaction(item(5));
const before = Date.now() - 1000;
assert.equal(q.pendingTransactions(scope, before).length, 1);
assert.equal(q.pendingTransactions(scope, before)[0].id, 'txr_' + item(5).requestId, 'Same id as the server will assign');
await q.flushTransactionQueue(scope, async () => {});
assert.equal(q.queuedTransactions(scope).length, 0, 'Synced items no longer count as waiting');
assert.equal(q.pendingTransactions(scope, before).length, 1, 'Still shown over data loaded before the sync');
assert.equal(q.pendingTransactions(scope, Date.now() + 1).length, 0, 'Hidden once fresh server data is loaded');

// Ghép vào danh sách + bỏ trùng theo id.
const pendingTx = { id: 'txr_x', date: '2026-11-15', type: 'expense', amount: 50000, category_id: 'food', member_id: 'wife', created_at: '2026-11-15T03:00:00Z', updated_at: '', note: 'Phở' };
const serverTx = { ...pendingTx, id: 'tx_old', date: '2026-11-14', amount: 10000, note: '' };
assert.deepEqual(q.mergePending([serverTx], [pendingTx]).map(t => t.id), ['txr_x', 'tx_old']);
assert.deepEqual(q.mergePending([pendingTx, serverTx], [pendingTx]).map(t => t.id), ['txr_x', 'tx_old'], 'No duplicate when server already has it');
assert.equal(q.matchesTransactionQuery(pendingTx, { from: '2026-11-01', through: '2026-11-30', type: 'expense', search: 'phở' }), true);
assert.equal(q.matchesTransactionQuery(pendingTx, { from: '2026-12-01' }), false);
assert.equal(q.matchesTransactionQuery(pendingTx, { member_id: 'husband' }), false);

// Cộng vào tổng quan đúng tháng.
const summary = { year: 2026, month: 11, total_income: 1000000, total_expense: 200000, balance: 800000, savings_rate: 80,
  member_breakdown: [{ member_id: 'husband', member_name: 'Chồng', total_expense: 200000, percentage: 100 }, { member_id: 'wife', member_name: 'Vợ', total_expense: 0, percentage: 0 }],
  budget_summary: { total_budget: 1000000, total_spent: 200000, remaining: 800000, percentage: 20 },
  category_breakdown: [{ category_id: 'home', category_name: 'Nhà', category_icon: 'Home', total: 200000, percentage: 100 }],
  recent_transactions: [serverTx] };
const s2 = q.applyPendingToSummary(summary, [pendingTx, { ...pendingTx, id: 'txr_dec', date: '2026-12-01' }], [{ id: 'food', name: 'Ăn uống', icon: 'Utensils' }]);
assert.equal(s2.total_expense, 250000); assert.equal(s2.balance, 750000); assert.equal(s2.savings_rate, 75);
assert.deepEqual(s2.budget_summary, { total_budget: 1000000, total_spent: 250000, remaining: 750000, percentage: 25 });
assert.deepEqual(s2.member_breakdown.map(m => [m.total_expense, m.percentage]), [[200000, 80], [50000, 20]]);
assert.deepEqual(s2.category_breakdown.map(c => [c.category_name, c.total, c.percentage]), [['Nhà', 200000, 80], ['Ăn uống', 50000, 20]]);
assert.deepEqual(s2.recent_transactions.map(t => t.id), ['txr_x', 'tx_old'], 'Other months ignored');
assert.equal(q.applyPendingToSummary(summary, []), summary, 'Unchanged when nothing pending');

store.set('fam_exp_offline_queue_v1', '{broken');
assert.deepEqual(q.queuedTransactions(scope), [], 'Corrupt storage is ignored safely');
console.log('Offline queue passed: order, dedupe, scope, stop-on-error, resume, single flusher, display overlay.');
