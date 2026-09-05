import { 
  Transaction, 
  Category, 
  Member, 
  Account, 
  Budget, 
  AppSettings, 
  BootstrapData, 
  DashboardSummary 
} from '../types';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_MEMBERS, 
  INITIAL_ACCOUNTS, 
  INITIAL_SETTINGS, 
  SAMPLE_TRANSACTIONS, 
  SAMPLE_BUDGETS 
} from './mockData';

// Local storage keys for mock/offline mode
const STORAGE_KEYS = {
  TRANSACTIONS: 'fam_exp_transactions',
  CATEGORIES: 'fam_exp_categories',
  MEMBERS: 'fam_exp_members',
  ACCOUNTS: 'fam_exp_accounts',
  BUDGETS: 'fam_exp_budgets',
  SETTINGS: 'fam_exp_settings',
  API_URL: 'fam_exp_api_url',
};

class ApiClient {
  private getApiUrl(): string {
    return (
      localStorage.getItem(STORAGE_KEYS.API_URL) ||
      import.meta.env.VITE_API_URL ||
      ''
    ).trim();
  }

  public setApiUrl(url: string) {
    if (url) {
      localStorage.setItem(STORAGE_KEYS.API_URL, url.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_URL);
    }
  }

  public isLiveMode(): boolean {
    return !!this.getApiUrl();
  }

  // --- LOCAL STORAGE HELPERS FOR MOCK / OFFLINE MODE ---
  private getLocal<T>(key: string, fallback: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch {
      return fallback;
    }
  }

  private setLocal<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage set error', e);
    }
  }

  private initMockStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      this.setLocal(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) {
      this.setLocal(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
      this.setLocal(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this.setLocal(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
      this.setLocal(STORAGE_KEYS.TRANSACTIONS, SAMPLE_TRANSACTIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BUDGETS)) {
      this.setLocal(STORAGE_KEYS.BUDGETS, SAMPLE_BUDGETS);
    }
  }

  // Generic request dispatcher for Google Apps Script Web App
  private async requestGAS<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const url = this.getApiUrl();
    if (!url) {
      throw new Error('Chưa cấu hình URL Google Apps Script');
    }

    try {
      // Use text/plain to avoid CORS preflight OPTIONS check in Google Apps Script
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, payload }),
      });

      if (!response.ok) {
        throw new Error(`Lỗi kết nối máy chủ: ${response.status} ${response.statusText}`);
      }

      const res = await response.json();
      if (!res.ok) {
        throw new Error(res.error?.message || 'Có lỗi xảy ra khi xử lý dữ liệu');
      }

      return res.data as T;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể kết nối đến Google Sheets';
      throw new Error(msg);
    }
  }

  // --- API METHODS ---

  async getBootstrapData(): Promise<BootstrapData> {
    if (this.isLiveMode()) {
      return this.requestGAS<BootstrapData>('getBootstrapData');
    }

    this.initMockStorage();
    const categories = this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const members = this.getLocal<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const accounts = this.getLocal<Account[]>(STORAGE_KEYS.ACCOUNTS, INITIAL_ACCOUNTS);
    const settings = this.getLocal<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    const allTxs = this.getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, SAMPLE_TRANSACTIONS);
    const budgets = this.getLocal<Budget[]>(STORAGE_KEYS.BUDGETS, SAMPLE_BUDGETS);

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const current_month_transactions = allTxs.filter(
      (tx) => !tx.deleted && tx.date.startsWith(currentMonthPrefix)
    );
    const current_month_budgets = budgets.filter(
      (b) => b.year === now.getFullYear() && b.month === now.getMonth() + 1
    );

    return {
      categories,
      members,
      accounts,
      settings,
      current_month_transactions,
      current_month_budgets,
    };
  }

  async getTransactions(params?: {
    from?: string;
    through?: string;
    type?: string;
    category_id?: string;
    member_id?: string;
  }): Promise<Transaction[]> {
    if (this.isLiveMode()) {
      return this.requestGAS<Transaction[]>('getTransactions', params || {});
    }

    this.initMockStorage();
    let list = this.getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, SAMPLE_TRANSACTIONS);
    list = list.filter((t) => !t.deleted);

    if (params?.from) {
      list = list.filter((t) => t.date >= params.from!);
    }
    if (params?.through) {
      list = list.filter((t) => t.date <= params.through!);
    }
    if (params?.type) {
      list = list.filter((t) => t.type === params.type);
    }
    if (params?.category_id) {
      list = list.filter((t) => t.category_id === params.category_id);
    }
    if (params?.member_id) {
      list = list.filter((t) => t.member_id === params.member_id);
    }

    // Sort descending by date, then created_at
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }

  async createTransaction(payload: Omit<Transaction, 'id' | 'created_at' | 'updated_at' | 'deleted'>): Promise<Transaction> {
    if (this.isLiveMode()) {
      return this.requestGAS<Transaction>('createTransaction', payload as unknown as Record<string, unknown>);
    }

    this.initMockStorage();
    const now = new Date().toISOString();
    const newTx: Transaction = {
      ...payload,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      created_at: now,
      updated_at: now,
      deleted: false,
    };

    const list = this.getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, SAMPLE_TRANSACTIONS);
    list.unshift(newTx);
    this.setLocal(STORAGE_KEYS.TRANSACTIONS, list);
    return newTx;
  }

  async updateTransaction(id: string, payload: Partial<Transaction>): Promise<Transaction> {
    if (this.isLiveMode()) {
      return this.requestGAS<Transaction>('updateTransaction', { id, ...payload });
    }

    this.initMockStorage();
    const list = this.getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, SAMPLE_TRANSACTIONS);
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy giao dịch để cập nhật');
    }

    const updated: Transaction = {
      ...list[index],
      ...payload,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    this.setLocal(STORAGE_KEYS.TRANSACTIONS, list);
    return updated;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    if (this.isLiveMode()) {
      return this.requestGAS<boolean>('deleteTransaction', { id });
    }

    this.initMockStorage();
    const list = this.getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, SAMPLE_TRANSACTIONS);
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy giao dịch để xóa');
    }

    // Soft delete
    list[index].deleted = true;
    list[index].updated_at = new Date().toISOString();
    this.setLocal(STORAGE_KEYS.TRANSACTIONS, list);
    return true;
  }

  async getDashboardSummary(year: number, month: number): Promise<DashboardSummary> {
    if (this.isLiveMode()) {
      return this.requestGAS<DashboardSummary>('getDashboardSummary', { year, month });
    }

    this.initMockStorage();
    const allTxs = this.getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, SAMPLE_TRANSACTIONS);
    const categories = this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);

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

    const members = this.getLocal<Member[]>(STORAGE_KEYS.MEMBERS, INITIAL_MEMBERS);
    const budgets = this.getLocal<Budget[]>(STORAGE_KEYS.BUDGETS, SAMPLE_BUDGETS);

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

    // Budget usage summary - tự động kế thừa hạn mức tháng gần nhất nếu tháng này chưa đặt
    let monthBudgets = budgets.filter((b) => b.year === year && b.month === month);
    if (monthBudgets.length === 0 && budgets.length > 0) {
      const pastBudgets = budgets
        .filter((b) => b.year < year || (b.year === year && b.month < month))
        .sort((a, b) => b.year - a.year || b.month - a.month);
      if (pastBudgets.length > 0) {
        const latestY = pastBudgets[0].year;
        const latestM = pastBudgets[0].month;
        monthBudgets = pastBudgets.filter((b) => b.year === latestY && b.month === latestM);
      }
    }
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

  async getCategories(): Promise<Category[]> {
    if (this.isLiveMode()) {
      return this.requestGAS<Category[]>('getCategories');
    }
    this.initMockStorage();
    return this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  }

  async createCategory(payload: Omit<Category, 'id'>): Promise<Category> {
    if (this.isLiveMode()) {
      return this.requestGAS<Category>('createCategory', payload as unknown as Record<string, unknown>);
    }
    this.initMockStorage();
    const categories = this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const newCat: Category = {
      ...payload,
      id: `cat_${Date.now()}`,
    };
    categories.push(newCat);
    this.setLocal(STORAGE_KEYS.CATEGORIES, categories);
    return newCat;
  }

  async updateCategory(id: string, payload: Partial<Category>): Promise<Category> {
    if (this.isLiveMode()) {
      return this.requestGAS<Category>('updateCategory', { id, ...payload });
    }
    this.initMockStorage();
    const categories = this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy danh mục để cập nhật');
    }
    categories[index] = { ...categories[index], ...payload };
    this.setLocal(STORAGE_KEYS.CATEGORIES, categories);
    return categories[index];
  }

  async getBudgets(year: number, month: number): Promise<Budget[]> {
    if (this.isLiveMode()) {
      return this.requestGAS<Budget[]>('getBudgets', { year, month });
    }
    this.initMockStorage();
    const budgets = this.getLocal<Budget[]>(STORAGE_KEYS.BUDGETS, SAMPLE_BUDGETS);
    const exact = budgets.filter((b) => b.year === year && b.month === month);
    if (exact.length > 0) {
      return exact;
    }

    // Tự động kế thừa hạn mức từ tháng gần nhất trước đó
    const pastBudgets = budgets
      .filter((b) => b.year < year || (b.year === year && b.month < month))
      .sort((a, b) => b.year - a.year || b.month - a.month);

    if (pastBudgets.length > 0) {
      const latestY = pastBudgets[0].year;
      const latestM = pastBudgets[0].month;
      return pastBudgets
        .filter((b) => b.year === latestY && b.month === latestM)
        .map((b) => ({
          ...b,
          id: `b_${year}_${month}_${b.category_id}`,
          year,
          month,
          inherited_from: `${latestM}/${latestY}`,
        }));
    }

    return [];
  }

  async saveBudget(payload: { year: number; month: number; category_id: string; amount: number }): Promise<Budget> {
    if (this.isLiveMode()) {
      return this.requestGAS<Budget>('saveBudget', payload);
    }
    this.initMockStorage();
    const budgets = this.getLocal<Budget[]>(STORAGE_KEYS.BUDGETS, SAMPLE_BUDGETS);
    const index = budgets.findIndex(
      (b) => b.year === payload.year && b.month === payload.month && b.category_id === payload.category_id
    );

    const now = new Date().toISOString();
    if (index !== -1) {
      budgets[index].amount = payload.amount;
      budgets[index].updated_at = now;
      this.setLocal(STORAGE_KEYS.BUDGETS, budgets);
      return budgets[index];
    } else {
      const newBudget: Budget = {
        id: `b_${payload.year}_${payload.month}_${payload.category_id}`,
        ...payload,
        created_at: now,
        updated_at: now,
      };
      budgets.push(newBudget);
      this.setLocal(STORAGE_KEYS.BUDGETS, budgets);
      return newBudget;
    }
  }

  async getMonthlyTrend(endYear: number, endMonth: number, count: number = 6): Promise<{
    month: number;
    year: number;
    label: string;
    income: number;
    expense: number;
    balance: number;
  }[]> {
    const months: { year: number; month: number }[] = [];
    let curY = endYear;
    let curM = endMonth;

    for (let i = 0; i < count; i++) {
      months.unshift({ year: curY, month: curM });
      curM--;
      if (curM < 1) {
        curM = 12;
        curY--;
      }
    }

    const summaries = await Promise.all(
      months.map((m) => this.getDashboardSummary(m.year, m.month))
    );

    return summaries.map((s) => ({
      month: s.month,
      year: s.year,
      label: `T${s.month}`,
      income: s.total_income,
      expense: s.total_expense,
      balance: s.balance,
    }));
  }

  async exportAllData() {
    this.initMockStorage();
    return {
      schema_version: 1,
      exported_at: new Date().toISOString(),
      transactions: this.getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []),
      categories: this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, []),
      members: this.getLocal<Member[]>(STORAGE_KEYS.MEMBERS, []),
      accounts: this.getLocal<Account[]>(STORAGE_KEYS.ACCOUNTS, []),
      budgets: this.getLocal<Budget[]>(STORAGE_KEYS.BUDGETS, []),
      settings: this.getLocal<AppSettings>(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS),
    };
  }

  async exportTransactionsCSV(): Promise<string> {
    this.initMockStorage();
    const txs = await this.getTransactions();
    const categories = await this.getCategories();

    // UTF-8 BOM so Excel opens Vietnamese characters cleanly
    let csv = '\uFEFFMã giao dịch,Ngày,Loại,Số tiền,Danh mục,Người thực hiện,Ghi chú,Ngày tạo\n';

    for (const t of txs) {
      const cat = categories.find((c) => c.id === t.category_id);
      const catName = cat ? cat.name : t.category_id;
      const typeStr = t.type === 'expense' ? 'Chi tiêu' : 'Thu nhập';
      const memberStr = t.member_id === 'husband' ? 'Chồng' : 'Vợ';
      const noteStr = t.note ? `"${t.note.replace(/"/g, '""')}"` : '';

      csv += `"${t.id}","${t.date}","${typeStr}",${t.amount},"${catName}","${memberStr}",${noteStr},"${t.created_at}"\n`;
    }

    return csv;
  }

  async importAllDataJSON(data: {
    schema_version?: number;
    transactions?: Transaction[];
    categories?: Category[];
    budgets?: Budget[];
    settings?: AppSettings;
  }): Promise<{ transactionsCount: number; categoriesCount: number; budgetsCount: number }> {
    if (!data || typeof data !== 'object') {
      throw new Error('Định dạng file JSON không hợp lệ');
    }

    if (Array.isArray(data.transactions)) {
      this.setLocal(STORAGE_KEYS.TRANSACTIONS, data.transactions);
    }
    if (Array.isArray(data.categories)) {
      this.setLocal(STORAGE_KEYS.CATEGORIES, data.categories);
    }
    if (Array.isArray(data.budgets)) {
      this.setLocal(STORAGE_KEYS.BUDGETS, data.budgets);
    }
    if (data.settings && typeof data.settings === 'object') {
      this.setLocal(STORAGE_KEYS.SETTINGS, data.settings);
    }

    return {
      transactionsCount: Array.isArray(data.transactions) ? data.transactions.length : 0,
      categoriesCount: Array.isArray(data.categories) ? data.categories.length : 0,
      budgetsCount: Array.isArray(data.budgets) ? data.budgets.length : 0,
    };
  }
}

export const api = new ApiClient();
