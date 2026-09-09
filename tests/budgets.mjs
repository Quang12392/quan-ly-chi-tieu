import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(fs.readFileSync('src/utils/budgets.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { resolveBudgets } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const backend = vm.createContext({});
vm.runInContext(fs.readFileSync('apps-script/Code_AllInOne.gs', 'utf8'), backend);
const budget = (year, month, category_id, amount) => ({ year, month, category_id, amount });
const history = [budget(2026, 9, 'food', 10), budget(2026, 9, 'study', 10), budget(2026, 9, 'travel', 2),
  budget(2026, 10, 'study', 12), budget(2026, 12, 'food', 8), budget(2027, 2, 'study', 15)];
const amounts = (list) => Object.fromEntries(list.map(b => [b.category_id, b.amount]));
for (const resolve of [resolveBudgets, backend.resolveBudgets]) {
  assert.deepEqual(amounts(resolve(history, 2026, 8)), {});
  assert.deepEqual(amounts(resolve(history, 2026, 9)), { food: 10, study: 10, travel: 2 });
  assert.deepEqual(amounts(resolve(history, 2026, 10)), { food: 10, study: 12, travel: 2 });
  assert.deepEqual(amounts(resolve(history, 2026, 11)), { food: 10, study: 12, travel: 2 });
  assert.deepEqual(amounts(resolve(history, 2027, 1)), { food: 8, study: 12, travel: 2 });
  assert.deepEqual(amounts(resolve(history, 2027, 2)), { food: 8, study: 15, travel: 2 });
  assert.equal(resolve(history, 2026, 10).find(b => b.category_id === 'study').inherited_from, undefined);
  assert.equal(resolve(history, 2026, 11).find(b => b.category_id === 'study').inherited_from, '10/2026');
  assert.equal(resolve([budget('2026', '9', 'food', '10')], 2026, 10)[0].amount, 10);
}
assert.equal(history[0].month, 9);
console.log('Budget regression checks passed for frontend and Apps Script.');

// Removal must block inheritance, preserve other categories and allow reactivation.
for (const resolve of [resolveBudgets, backend.resolveBudgets]) {
  const removed = [...history, budget(2026, 10, 'study', 0)];
  assert.deepEqual(amounts(resolve(removed, 2026, 9)), { food: 10, study: 10, travel: 2 });
  assert.deepEqual(amounts(resolve(removed, 2026, 10)), { food: 10, travel: 2 });
  assert.deepEqual(amounts(resolve(removed, 2027, 1)), { food: 8, travel: 2 });
  assert.deepEqual(amounts(resolve(removed, 2027, 2)), { food: 8, study: 15, travel: 2 });
  const inheritedRemoval = [...history, budget(2026, 11, 'travel', 0)];
  assert.deepEqual(amounts(resolve(inheritedRemoval, 2026, 12)), { food: 8, study: 12 });
  assert.deepEqual(amounts(resolve([budget(2026, 9, 'food', 10), budget(2026, 10, 'food', 0)], 2026, 11)), {});
}
console.log('Removal, inheritance blocking, past months and reactivation checks passed.');
