/**
 * DASHBOARD & BOOTSTRAP SERVICE
 */

function handleGetBootstrapData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const categoriesSheet = ss.getSheetByName('Categories');
  const membersSheet = ss.getSheetByName('Members');
  const accountsSheet = ss.getSheetByName('Accounts');
  const settingsSheet = ss.getSheetByName('Settings');
  const txSheet = ss.getSheetByName('Transactions');
  const budgetSheet = ss.getSheetByName('Budgets');

  const categories = categoriesSheet ? sheetToObjects(categoriesSheet) : [];
  const members = membersSheet ? sheetToObjects(membersSheet) : [];
  const accounts = accountsSheet ? sheetToObjects(accountsSheet) : [];

  // Parse settings key-value
  const settings = {};
  if (settingsSheet) {
    const rawSettings = sheetToObjects(settingsSheet);
    rawSettings.forEach(s => {
      if (s.key) settings[s.key] = s.value;
    });
  }

  // Filter current month transactions & budgets
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const padMonth = ('0' + month).slice(-2);
  const monthPrefix = year + '-' + padMonth;

  let allTxs = txSheet ? sheetToObjects(txSheet) : [];
  allTxs = allTxs.filter(t => !(t.deleted === true || String(t.deleted).toLowerCase() === 'true'));
  const current_month_transactions = allTxs.filter(t => String(t.date).startsWith(monthPrefix));

  let allBudgets = budgetSheet ? sheetToObjects(budgetSheet) : [];
  const current_month_budgets = allBudgets.filter(b => Number(b.year) === year && Number(b.month) === month);

  return successResponse({
    categories: categories.filter(c => c.active === true || String(c.active).toLowerCase() === 'true'),
    members: members.filter(m => m.active === true || String(m.active).toLowerCase() === 'true'),
    accounts: accounts.filter(a => a.active === true || String(a.active).toLowerCase() === 'true'),
    settings: settings,
    current_month_transactions: current_month_transactions,
    current_month_budgets: current_month_budgets
  });
}

function handleGetDashboardSummary(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const txSheet = ss.getSheetByName('Transactions');
  const catSheet = ss.getSheetByName('Categories');

  if (!txSheet) {
    return successResponse({
      month: payload.month,
      year: payload.year,
      total_income: 0,
      total_expense: 0,
      balance: 0,
      category_breakdown: [],
      recent_transactions: []
    });
  }

  const year = Number(payload.year);
  const month = Number(payload.month);
  const padMonth = ('0' + month).slice(-2);
  const monthPrefix = year + '-' + padMonth;

  const allTxs = sheetToObjects(txSheet);
  const categories = catSheet ? sheetToObjects(catSheet) : [];

  const monthTxs = allTxs.filter(t => {
    if (t.deleted === true || String(t.deleted).toLowerCase() === 'true') return false;
    return String(t.date).startsWith(monthPrefix);
  });

  let total_income = 0;
  let total_expense = 0;
  const catMap = {};

  monthTxs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      total_income += amt;
    } else {
      total_expense += amt;
      catMap[t.category_id] = (catMap[t.category_id] || 0) + amt;
    }
  });

  const category_breakdown = Object.keys(catMap).map(catId => {
    const cat = categories.find(c => c.id === catId);
    const sum = catMap[catId];
    return {
      category_id: catId,
      category_name: cat ? cat.name : catId,
      category_icon: cat ? cat.icon : 'Tag',
      total: sum,
      percentage: total_expense > 0 ? Math.round((sum / total_expense) * 100) : 0
    };
  }).sort((a, b) => b.total - a.total);

  // Recent 10 transactions
  const recent_transactions = monthTxs.slice().sort((a, b) => {
    return String(b.date).localeCompare(String(a.date)) ||
           String(b.created_at).localeCompare(String(a.created_at));
  }).slice(0, 10);

  const membersSheet = ss.getSheetByName('Members');
  const budgetSheet = ss.getSheetByName('Budgets');
  const members = membersSheet ? sheetToObjects(membersSheet) : [];
  const budgets = budgetSheet ? sheetToObjects(budgetSheet) : [];

  // Member breakdown
  const memberExpenseMap = { husband: 0, wife: 0 };
  monthTxs.forEach(t => {
    if (t.type === 'expense') {
      const mId = t.member_id || 'husband';
      memberExpenseMap[mId] = (memberExpenseMap[mId] || 0) + (Number(t.amount) || 0);
    }
  });

  const member_breakdown = [
    {
      member_id: 'husband',
      member_name: (members.find(m => m.id === 'husband') || {}).name || 'Chồng',
      total_expense: memberExpenseMap['husband'] || 0,
      percentage: total_expense > 0 ? Math.round(((memberExpenseMap['husband'] || 0) / total_expense) * 100) : 0
    },
    {
      member_id: 'wife',
      member_name: (members.find(m => m.id === 'wife') || {}).name || 'Vợ',
      total_expense: memberExpenseMap['wife'] || 0,
      percentage: total_expense > 0 ? Math.round(((memberExpenseMap['wife'] || 0) / total_expense) * 100) : 0
    }
  ];

  // Budget summary - tự động kế thừa hạn mức tháng gần nhất nếu tháng này chưa đặt
  let monthBudgets = budgets.filter(b => Number(b.year) === year && Number(b.month) === month);
  if (monthBudgets.length === 0 && budgets.length > 0) {
    const pastBudgets = budgets
      .filter(b => (Number(b.year) < year) || (Number(b.year) === year && Number(b.month) < month))
      .sort((a, b) => (Number(b.year) - Number(a.year)) || (Number(b.month) - Number(a.month)));
    if (pastBudgets.length > 0) {
      const latestY = Number(pastBudgets[0].year);
      const latestM = Number(pastBudgets[0].month);
      monthBudgets = pastBudgets.filter(b => Number(b.year) === latestY && Number(b.month) === latestM);
    }
  }
  let total_budget = 0;
  monthBudgets.forEach(b => { total_budget += Number(b.amount) || 0; });
  const budget_summary = {
    total_budget: total_budget,
    total_spent: total_expense,
    remaining: Math.max(0, total_budget - total_expense),
    percentage: total_budget > 0 ? Math.round((total_expense / total_budget) * 100) : 0
  };

  const balance = total_income - total_expense;
  const savings_rate = total_income > 0 ? Math.max(0, Math.round((balance / total_income) * 100)) : 0;

  return successResponse({
    month: month,
    year: year,
    total_income: total_income,
    total_expense: total_expense,
    balance: balance,
    savings_rate: savings_rate,
    member_breakdown: member_breakdown,
    budget_summary: budget_summary,
    category_breakdown: category_breakdown,
    recent_transactions: recent_transactions
  });
}
