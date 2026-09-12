import { Transaction, Category, Budget, Member, DashboardSummary } from '../types';
import { resolveBudgets } from './budgets';
export function summarizeTransactions(allTxs: Transaction[], categories: Category[], budgets: Budget[], members: Member[], year: number, month: number): DashboardSummary {
    const padMonth = String(month).padStart(2, '0');
    const prefix = `${year}-${padMonth}`;
    const monthTxs = allTxs.filter((t) => !t.deleted && t.date.startsWith(prefix));

    let total_income = 0;
    let total_expense = 0;
    const catMap: Record<string, number> = {};

    for (const tx of monthTxs) {
      if (tx.type === 'income') {
        total_income += tx.amount;
      } else {
        total_expense += tx.amount;
        catMap[tx.category_id] = (catMap[tx.category_id] || 0) + tx.amount;
      }
    }

    const category_breakdown = Object.entries(catMap)
      .map(([catId, sum]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          category_id: catId,
          category_name: cat ? cat.name : catId,
          category_icon: cat ? cat.icon : 'Tag',
          total: sum,
          percentage: total_expense > 0 ? Math.round((sum / total_expense) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);



    // Member expense breakdown
    const memberExpenseMap: Record<string, number> = { husband: 0, wife: 0 };
    for (const tx of monthTxs) {
      if (tx.type === 'expense') {
        const mId = tx.member_id || 'husband';
        memberExpenseMap[mId] = (memberExpenseMap[mId] || 0) + tx.amount;
      }
    }

    const member_breakdown = [
      {
        member_id: 'husband',
        member_name: members.find((m) => m.id === 'husband')?.name || 'Chồng',
        total_expense: memberExpenseMap['husband'] || 0,
        percentage: total_expense > 0 ? Math.round(((memberExpenseMap['husband'] || 0) / total_expense) * 100) : 0,
      },
      {
        member_id: 'wife',
        member_name: members.find((m) => m.id === 'wife')?.name || 'Vợ',
        total_expense: memberExpenseMap['wife'] || 0,
        percentage: total_expense > 0 ? Math.round(((memberExpenseMap['wife'] || 0) / total_expense) * 100) : 0,
      },
    ];

    const monthBudgets = resolveBudgets(budgets, year, month);
    const total_budget = monthBudgets.reduce((sum, b) => sum + b.amount, 0);
    const budget_summary = {
      total_budget,
      total_spent: total_expense,
      remaining: Math.max(0, total_budget - total_expense),
      percentage: total_budget > 0 ? Math.round((total_expense / total_budget) * 100) : 0,
    };

    const balance = total_income - total_expense;
    const savings_rate = total_income > 0 ? Math.max(0, Math.round((balance / total_income) * 100)) : 0;

    const recent_transactions = [...monthTxs]
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
      .slice(0, 10);

    return {
      month,
      year,
      total_income,
      total_expense,
      balance,
      savings_rate,
      member_breakdown,
      budget_summary,
      category_breakdown,
      recent_transactions,
    };
}
