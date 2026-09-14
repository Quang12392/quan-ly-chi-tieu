import { PageSnapshot, readPageCache, writePageCache, DashboardSnapshot, clearDashboardCache, dashboardRevision, readDashboardCache, writeDashboardCache, validDashboard } from '../utils/dashboardCache';
import { summarizeTransactions } from '../utils/summary';
import { TransactionQuery, TransactionPage, ReportBundle, StorageStatus } from '../types';
import { resolveBudgets } from '../utils/budgets';
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
  CATEGORY_PREVIEW: 'fam_exp_category_preview_v1',
};

class ApiClient {
  private metadata = new Map<string, { expires: number; value: Promise<unknown> }>();
  private invalidate() { this.metadata.clear(); clearDashboardCache(); }
  private memo<T>(key: string, loader: () => Promise<T>, ttl = 15000): Promise<T> {
    const fullKey = this.getApiUrl() + key;
    const old = this.metadata.get(fullKey);
    if (old && old.expires > Date.now()) return old.value as Promise<T>;
    const value = loader().catch(error => { this.metadata.delete(fullKey); throw error; });
    this.metadata.set(fullKey, { value, expires: Date.now() + ttl });
    return value;
  }

  private categoryScope(): string {
    return JSON.stringify([this.getApiUrl() || 'local', localStorage.getItem('family_auth_session') || '']);
  }

  private normalizeCategories(value: unknown): Category[] {
    if (!Array.isArray(value)) throw new Error('Phản hồi danh mục không hợp lệ. Vui lòng thử lại.');
    return value.map((item) => {
      const category = item as Partial<Category>;
      if (!category || typeof category.id !== 'string' || typeof category.name !== 'string'
        || (category.type !== 'expense' && category.type !== 'income')) {
        throw new Error('Phản hồi danh mục không hợp lệ. Vui lòng thử lại.');
      }
      return {
        id: category.id,
        name: category.name,
        type: category.type,
        icon: typeof category.icon === 'string' ? category.icon : 'Tag',
        sort_order: Number(category.sort_order) || 99,
        active: category.active === true || String(category.active).toLowerCase() === 'true',
      };
    });
  }

  private rememberCategories(value: unknown): Category[] {
    const categories = this.normalizeCategories(value);
    const fullKey = this.getApiUrl() + 'categories';
    this.metadata.set(fullKey, { value: Promise.resolve(categories), expires: Date.now() + 15000 });
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORY_PREVIEW, JSON.stringify({
        scope: this.categoryScope(),
        categories,
        savedAt: Date.now(),
      }));
    } catch { /* The form can still use the fresh server response when storage is unavailable. */ }
    return categories;
  }

  public getCachedCategories(): Category[] | null {
    if (!this.isLiveMode()) {
      this.initMockStorage();
      return this.normalizeCategories(this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES));
    }
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORY_PREVIEW) || 'null');
      if (stored?.scope !== this.categoryScope()) return null;
      return this.normalizeCategories(stored.categories);
    } catch { return null; }
  }
  async getStorageStatus(): Promise<StorageStatus> {
    if (!this.isLiveMode()) return { api_version: 2, storage_version: 0 };
    return this.memo('storageStatus', async () => {
      try { return await this.requestGAS<StorageStatus>('storageStatus'); }
      catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_ACTION:')) return { api_version: 1, storage_version: 1 };
        throw error;
      }
    }, 30000);
  }

  private getApiUrl(): string {
    return (
      localStorage.getItem(STORAGE_KEYS.API_URL) ||
      import.meta.env.VITE_API_URL ||
      ''
    ).trim();
  }

  public setApiUrl(url: string) {
    this.invalidate();
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

    const write = /^(create|update|delete|save|rebuild)/.test(action);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), write ? 45000 : 20000);
    try {
      // Use text/plain to avoid CORS preflight OPTIONS check in Google Apps Script
      const response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
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
        throw new Error(`${res.error?.code || 'SERVER_ERROR'}: ${res.error?.message || 'Có lỗi xảy ra khi xử lý dữ liệu'}`);
      }

      return res.data as T;
    } catch (err: unknown) {
      if (controller.signal.aborted) throw new Error(write
        ? 'Chưa xác nhận được kết quả lưu. Hãy kiểm tra Lịch sử giao dịch trước khi thử lưu lại.'
        : 'Google Sheets phản hồi quá lâu. Vui lòng thử cập nhật lại.');
      const msg = err instanceof Error ? err.message : 'Không thể kết nối đến Google Sheets';
      throw new Error(msg);
    } finally {
      clearTimeout(timeout);
      if (/^(create|update|delete|save|rebuild)/.test(action)) this.invalidate();
    }
  }

  // --- API METHODS ---

  async getBootstrapData(): Promise<BootstrapData> {
    if (this.isLiveMode()) {
      const data = await this.requestGAS<BootstrapData>('getBootstrapData');
      return { ...data, categories: this.rememberCategories(data.categories) };
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
    this.invalidate();
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

  async updateTransaction(id: string, payload: Partial<Transaction>, originalYear?: number): Promise<Transaction> {
    this.invalidate();
    if (this.isLiveMode()) {
      return this.requestGAS<Transaction>('updateTransaction', { id, ...payload, original_year: originalYear });
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

  async deleteTransaction(id: string, originalYear?: number): Promise<boolean> {
    this.invalidate();
    if (this.isLiveMode()) {
      return this.requestGAS<boolean>('deleteTransaction', { id, original_year: originalYear });
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

  private dashboardScope(): string {
    return JSON.stringify([this.getApiUrl() || 'local', localStorage.getItem('family_auth_session') || '']);
  }
  getCachedDashboard(year: number, month: number): DashboardSnapshot | null {
    const snapshot = readDashboardCache(this.dashboardScope(), year, month);
    if (snapshot) snapshot.categories = this.rememberCategories(snapshot.categories);
    return snapshot;
  }
  async getDashboardSnapshot(year: number, month: number): Promise<DashboardSnapshot> {
    const scope = this.dashboardScope(), revision = dashboardRevision();
    let summary: DashboardSummary;
    let categories: Category[];
    if (this.isLiveMode()) {
      // Modern backend returns everything in one response; no status probe first.
      const result = await this.requestGAS<DashboardSummary & { categories?: Category[] }>('getDashboardSummary', {year, month});
      summary = result;
      if (Array.isArray(result.categories)) categories = this.rememberCategories(result.categories);
      else {
        // Keep compatibility with the older backend without a separate capability request.
        const [cats, budgets] = await Promise.all([this.getCategories(), this.getBudgets(year, month)]);
        categories = cats;
        const total = budgets.reduce((sum,b) => sum+b.amount,0);
        summary = {...result, budget_summary:{total_budget:total,total_spent:result.total_expense,remaining:Math.max(0,total-result.total_expense),percentage:total?Math.round(result.total_expense/total*100):0}};
      }
    } else {
      [summary, categories] = await Promise.all([this.getDashboardSummary(year, month), this.getCategories()]);
    }
    if (!validDashboard(summary) || summary.year !== year || summary.month !== month) throw new Error('Số liệu Tổng quan không hợp lệ. Vui lòng cập nhật lại.');
    // Never publish a read that started before a write, logout, or connection change.
    if (scope !== this.dashboardScope() || revision !== dashboardRevision()) throw new Error('Dữ liệu vừa thay đổi. Vui lòng cập nhật lại.');
    const snapshot = {summary,categories,savedAt:Date.now()};
    writeDashboardCache(scope,snapshot);
    return snapshot;
  }

  async getDashboardSummary(year: number, month: number): Promise<DashboardSummary> {
    if (this.isLiveMode()) {
      if ((await this.getStorageStatus()).api_version >= 2) return this.requestGAS<DashboardSummary>('getDashboardSummary', {year, month});
      const [summary, budgets] = await Promise.all([
        this.requestGAS<DashboardSummary>('getDashboardSummary', { year, month }),
        this.getBudgets(year, month),
      ]);
      const total = budgets.reduce((sum, budget) => sum + budget.amount, 0);
      return { ...summary, budget_summary: {
        total_budget: total,
        total_spent: summary.total_expense,
        remaining: Math.max(0, total - summary.total_expense),
        percentage: total > 0 ? Math.round(summary.total_expense / total * 100) : 0,
      } };
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

  async getCategories(): Promise<Category[]> {
    if (this.isLiveMode()) {
      return this.memo('categories', async () => this.rememberCategories(
        await this.requestGAS<Category[]>('getCategories')
      ));
    }
    this.initMockStorage();
    return this.normalizeCategories(this.getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES));
  }

  async createCategory(payload: Omit<Category, 'id'>): Promise<Category> {
    this.invalidate();
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
    this.invalidate();
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
      // An unfiltered request also works with the existing Apps Script deployment.
      const budgets = await this.memo('budgets', () => this.requestGAS<Budget[]>('getBudgets', {}));
      return resolveBudgets(budgets, year, month);
    }
    this.initMockStorage();
    return resolveBudgets(this.getLocal<Budget[]>(STORAGE_KEYS.BUDGETS, SAMPLE_BUDGETS), year, month);
  }

  async saveBudget(payload: { year: number; month: number; category_id: string; amount: number }): Promise<Budget> {
    this.invalidate();
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

  transactionViewKey(query: TransactionQuery): string {
    return JSON.stringify(['transactions',query.from || '',query.through || '',query.type || '',query.member_id || '',query.category_id || '',(query.search || '').trim(),query.limit || 100]);
  }
  private validTransactionView(data: unknown): data is {page: TransactionPage; categories: Category[]} {
    const view = data as {page?: TransactionPage; categories?: Category[]} | null;
    return !!view && !!view.page && Array.isArray(view.page.items) && Array.isArray(view.categories)
      && view.page.items.every(t => t && typeof t.id === 'string' && typeof t.date === 'string' && Number.isFinite(t.amount));
  }
  getCachedTransactions(query: TransactionQuery): PageSnapshot<{page: TransactionPage; categories: Category[]}> | null {
    const snapshot = readPageCache(this.dashboardScope(),this.transactionViewKey(query),data => this.validTransactionView(data));
    if (snapshot) snapshot.data.categories = this.rememberCategories(snapshot.data.categories);
    return snapshot;
  }
  async getTransactionSnapshot(query: TransactionQuery): Promise<PageSnapshot<{page: TransactionPage; categories: Category[]}>> {
    const scope = this.dashboardScope(), revision = dashboardRevision();
    const [page,categories] = await Promise.all([this.getTransactionPage(query),this.getCategories()]);
    const data = {page,categories};
    if (!this.validTransactionView(data)) throw new Error('Không thể đọc danh sách. Vui lòng tải lại.');
    if (scope !== this.dashboardScope() || revision !== dashboardRevision()) throw new Error('Dữ liệu vừa thay đổi. Vui lòng tải lại.');
    const snapshot = {data,savedAt:Date.now()};
    // Only the first page is cached. Old cursors must be revalidated before paging.
    if (!query.cursor) writePageCache(scope,this.transactionViewKey(query),snapshot);
    return snapshot;
  }
  private validReport(data: unknown): data is ReportBundle {
    const r = data as ReportBundle | null;
    return !!r && validDashboard(r.summary) && validDashboard(r.previous) && Array.isArray(r.categories)
      && Array.isArray(r.budgets) && Array.isArray(r.trend) && Array.isArray(r.years);
  }
  getCachedReport(year: number, month: number): PageSnapshot<ReportBundle> | null {
    const snapshot = readPageCache(this.dashboardScope(),`report:${year}:${month}`,data => this.validReport(data));
    if (snapshot) snapshot.data.categories = this.rememberCategories(snapshot.data.categories);
    return snapshot;
  }
  async getReportSnapshot(year: number, month: number): Promise<PageSnapshot<ReportBundle>> {
    const scope = this.dashboardScope(), revision = dashboardRevision();
    const data = await this.getReportBundle(year,month);
    if (!this.validReport(data) || data.summary.year !== year || data.summary.month !== month) throw new Error('Số liệu báo cáo không hợp lệ.');
    if (scope !== this.dashboardScope() || revision !== dashboardRevision()) throw new Error('Dữ liệu vừa thay đổi. Vui lòng tải lại.');
    const snapshot = {data,savedAt:Date.now()};
    writePageCache(scope,`report:${year}:${month}`,snapshot);
    return snapshot;
  }

  async getTransactionPage(query: TransactionQuery): Promise<TransactionPage> {
    if (this.isLiveMode() && (await this.getStorageStatus()).api_version >= 2) {
      const page = await this.requestGAS<TransactionPage | Transaction[]>('getTransactionsPage', { ...query });
      // Some older deployments return [] for an empty date range.
      if (Array.isArray(page) && page.length === 0) return { items: [], next_cursor: null };
      if (!page || Array.isArray(page) || !Array.isArray(page.items)) {
        throw new Error('Phản hồi danh sách giao dịch không hợp lệ. Vui lòng tải lại.');
      }
      return { items: page.items, next_cursor: page.next_cursor || null };
    }
    // Compatibility with the previous deployment: month filtering is already supported.
    const [transactions, categories] = await Promise.all([this.getTransactions(query), this.getCategories()]);
    const q = (query.search || '').trim().toLowerCase();
    const list = transactions.filter(t => !q || `${t.note || ''} ${categories.find(c => c.id === t.category_id)?.name || ''}`.toLowerCase().includes(q));
    const offset = Number(query.cursor || 0), limit = query.limit || 100;
    return { items: list.slice(offset, offset + limit), next_cursor: list.length > offset + limit ? String(offset + limit) : null };
  }

  async getReportBundle(year: number, month: number): Promise<ReportBundle> {
    if (this.isLiveMode() && (await this.getStorageStatus()).api_version >= 2) {
      const report = await this.requestGAS<ReportBundle>('getReportBundle', {year, month});
      return { ...report, categories: this.rememberCategories(report.categories) };
    }
    // One detail request for the entire report, instead of 14 separate scans.
    const [transactions, categories] = await Promise.all([this.getTransactions(), this.getCategories()]);
    const budgets = this.isLiveMode()
      ? await this.memo('budgets', () => this.requestGAS<Budget[]>('getBudgets', {}))
      : this.getLocal<Budget[]>(STORAGE_KEYS.BUDGETS, SAMPLE_BUDGETS);
    const summarize = (y: number, m: number) => summarizeTransactions(transactions, categories, budgets, INITIAL_MEMBERS, y, m);
    const trend = Array.from({length: 12}, (_, i) => {
      const s = summarize(year, i + 1);
      return { year, month: i + 1, label: `T${i + 1}`, income: s.total_income, expense: s.total_expense, balance: s.balance };
    });
    const years = Array.from(new Set(transactions.map(t => Number(t.date.slice(0, 4))).concat(year))).sort((a,b) => a-b).map(y => {
      const txs = transactions.filter(t => Number(t.date.slice(0,4)) === y);
      const income = txs.filter(t => t.type === 'income').reduce((sum,t) => sum+t.amount,0);
      const expense = txs.filter(t => t.type === 'expense').reduce((sum,t) => sum+t.amount,0);
      return {year:y,income,expense,balance:income-expense};
    });
    return { summary: summarize(year, month), previous: summarize(month === 1 ? year-1 : year, month === 1 ? 12 : month-1), categories, budgets: resolveBudgets(budgets, year, month), trend, years };
  }

  async rebuildSummaries(year: number): Promise<void> {
    this.invalidate();
    if (!this.isLiveMode()) return;
    if ((await this.getStorageStatus()).api_version < 2) throw new Error('Cần cập nhật Apps Script trước khi tính lại báo cáo.');
    await this.requestGAS('rebuildSummaries', {year});
  }

  async exportAllData() {
    if (this.isLiveMode()) {
      if ((await this.getStorageStatus()).api_version < 2) throw new Error('Cần cập nhật Apps Script để sao lưu toàn bộ dữ liệu Google Sheets. Bạn vẫn có thể xuất CSV.');
      return this.requestGAS('exportData');
    }
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
    this.invalidate();
    if (this.isLiveMode()) throw new Error('Nhập JSON chỉ áp dụng cho dữ liệu nội bộ. Dữ liệu Google Sheets cần khôi phục từ bản sao lưu trên Drive.');
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
