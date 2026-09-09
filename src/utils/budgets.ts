import { Budget } from '../types';

/** Each category keeps its most recent limit until explicitly changed. */
export function resolveBudgets(budgets: Budget[], year: number, month: number): Budget[] {
  const latest = new Map<string, Budget>();
  for (const budget of budgets) {
    const period = Number(budget.year) * 12 + Number(budget.month);
    if (period > year * 12 + month) continue;
    const previous = latest.get(budget.category_id);
    if (!previous || period >= Number(previous.year) * 12 + Number(previous.month)) {
      latest.set(budget.category_id, budget);
    }
  }
  return Array.from(latest.values(), (budget) => ({
    ...budget,
    amount: Number(budget.amount),
    id: `b_${year}_${month}_${budget.category_id}`,
    year,
    month,
    inherited_from: Number(budget.year) === year && Number(budget.month) === month
      ? undefined : `${budget.month}/${budget.year}`,
  }));
}
