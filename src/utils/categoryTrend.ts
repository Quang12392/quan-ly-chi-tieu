import { Transaction } from '../types';
export interface CategoryTrend { categoryId: string; year: number; months: number[]; total: number; }
export function categoryTrend(transactions: Transaction[], categoryId: string, year: number): CategoryTrend {
  const months = Array<number>(12).fill(0);
  for (const tx of transactions) {
    if (tx.deleted || tx.type !== 'expense' || tx.category_id !== categoryId || !tx.date.startsWith(`${year}-`)) continue;
    const month = Number(tx.date.slice(5,7));
    if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isFinite(tx.amount)) months[month-1] += tx.amount;
  }
  return {categoryId,year,months,total:months.reduce((a,b)=>a+b,0)};
}
export function validCategoryTrend(value: unknown): value is CategoryTrend {
  const t = value as CategoryTrend | null;
  return !!t && typeof t.categoryId === 'string' && Number.isInteger(t.year) && Array.isArray(t.months) && t.months.length === 12
    && t.months.every(n=>Number.isFinite(n)&&n>=0) && Number.isFinite(t.total) && t.total === t.months.reduce((a,b)=>a+b,0);
}
