export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number; // Integer VND
  category_id: string;
  member_id: string;
  account_id?: string;
  note?: string;
  created_at: string;
  updated_at: string;
  deleted?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  sort_order: number;
  active: boolean;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'member';
  active: boolean;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'e_wallet' | 'other';
  opening_balance: number;
  active: boolean;
  sort_order: number;
}

export interface Budget {
  id: string;
  year: number;
  month: number;
  category_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
  inherited_from?: string;
}

export interface AppSettings {
  family_name: string;
  currency: string;
  timezone: string;
  locale: string;
  schema_version: number;
  [key: string]: string | number;
}

export interface BootstrapData {
  categories: Category[];
  members: Member[];
  accounts: Account[];
  settings: AppSettings;
  current_month_transactions: Transaction[];
  current_month_budgets: Budget[];
}

export interface DashboardSummary {
  month: number;
  year: number;
  total_income: number;
  total_expense: number;
  balance: number;
  savings_rate: number;
  member_breakdown: {
    member_id: string;
    member_name: string;
    total_expense: number;
    percentage: number;
  }[];
  budget_summary: {
    total_budget: number;
    total_spent: number;
    remaining: number;
    percentage: number;
  };
  category_breakdown: {
    category_id: string;
    category_name: string;
    category_icon: string;
    total: number;
    percentage: number;
  }[];
  recent_transactions: Transaction[];
}
