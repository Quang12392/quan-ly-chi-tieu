import { Category, Member, Account, AppSettings, Transaction, Budget } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  // Chi tiêu (Expense)
  { id: 'food', name: 'Ăn uống', type: 'expense', icon: 'Utensils', sort_order: 1, active: true },
  { id: 'home', name: 'Nhà cửa', type: 'expense', icon: 'Home', sort_order: 2, active: true },
  { id: 'transport', name: 'Đi lại', type: 'expense', icon: 'Car', sort_order: 3, active: true },
  { id: 'children', name: 'Con cái', type: 'expense', icon: 'Baby', sort_order: 4, active: true },
  { id: 'shopping', name: 'Mua sắm', type: 'expense', icon: 'ShoppingBag', sort_order: 5, active: true },
  { id: 'health', name: 'Sức khỏe', type: 'expense', icon: 'HeartPulse', sort_order: 6, active: true },
  { id: 'utilities', name: 'Điện nước / Internet', type: 'expense', icon: 'Zap', sort_order: 7, active: true },
  { id: 'entertainment', name: 'Giải trí', type: 'expense', icon: 'Film', sort_order: 8, active: true },
  { id: 'education', name: 'Học tập', type: 'expense', icon: 'BookOpen', sort_order: 9, active: true },
  { id: 'family', name: 'Gia đình / Hiếu hỉ', type: 'expense', icon: 'Users', sort_order: 10, active: true },
  { id: 'other_expense', name: 'Chi tiêu khác', type: 'expense', icon: 'MoreHorizontal', sort_order: 11, active: true },

  // Thu nhập (Income)
  { id: 'salary', name: 'Tiền lương', type: 'income', icon: 'Briefcase', sort_order: 1, active: true },
  { id: 'bonus', name: 'Tiền thưởng', type: 'income', icon: 'Gift', sort_order: 2, active: true },
  { id: 'business', name: 'Kinh doanh', type: 'income', icon: 'TrendingUp', sort_order: 3, active: true },
  { id: 'side_income', name: 'Thu nhập thêm', type: 'income', icon: 'Coins', sort_order: 4, active: true },
  { id: 'other_income', name: 'Thu nhập khác', type: 'income', icon: 'Wallet', sort_order: 5, active: true },
];

export const INITIAL_MEMBERS: Member[] = [
  { id: 'husband', name: 'Chồng', role: 'owner', active: true },
  { id: 'wife', name: 'Vợ', role: 'member', active: true },
];

export const INITIAL_ACCOUNTS: Account[] = [
  { id: 'cash', name: 'Tiền mặt', type: 'cash', opening_balance: 0, active: true, sort_order: 1 },
  { id: 'bank_husband', name: 'Ngân hàng Chồng', type: 'bank', opening_balance: 0, active: true, sort_order: 2 },
  { id: 'bank_wife', name: 'Ngân hàng Vợ', type: 'bank', opening_balance: 0, active: true, sort_order: 3 },
  { id: 'shared_bank', name: 'Tài khoản chung', type: 'bank', opening_balance: 0, active: true, sort_order: 4 },
];

export const INITIAL_SETTINGS: AppSettings = {
  family_name: 'Sổ Chi Tiêu Gia Đình',
  currency: 'VND',
  timezone: 'Asia/Bangkok',
  locale: 'vi-VN',
  schema_version: 1,
};

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_sample_1',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    amount: 150000,
    category_id: 'food',
    member_id: 'husband',
    account_id: 'cash',
    note: 'Đi siêu thị mua thức ăn',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'tx_sample_2',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    amount: 450000,
    category_id: 'children',
    member_id: 'wife',
    account_id: 'bank_wife',
    note: 'Mua bỉm tã cho bé',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted: false,
  },
  {
    id: 'tx_sample_3',
    date: new Date().toISOString().slice(0, 10),
    type: 'income',
    amount: 25000000,
    category_id: 'salary',
    member_id: 'husband',
    account_id: 'bank_husband',
    note: 'Nhận lương tháng',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted: false,
  },
];

export const SAMPLE_BUDGETS: Budget[] = [
  {
    id: 'b_food',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    category_id: 'food',
    amount: 6000000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'b_children',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    category_id: 'children',
    amount: 4000000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
