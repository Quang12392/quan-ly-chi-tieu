// Test dashboard calculations and boundary conditions as specified in Section 48

function calculateDashboardSummary(transactions, year, month) {
  const padMonth = String(month).padStart(2, '0');
  const monthPrefix = `${year}-${padMonth}`;

  // Filter transactions for specific month, ignore deleted
  const monthTxs = transactions.filter(t => {
    if (t.deleted) return false;
    return String(t.date).startsWith(monthPrefix);
  });

  let total_income = 0;
  let total_expense = 0;
  const memberExpenseMap = { husband: 0, wife: 0 };
  const catMap = {};

  monthTxs.forEach(t => {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      total_income += amt;
    } else {
      total_expense += amt;
      catMap[t.category_id] = (catMap[t.category_id] || 0) + amt;
      const mId = t.member_id || 'husband';
      memberExpenseMap[mId] = (memberExpenseMap[mId] || 0) + amt;
    }
  });

  const balance = total_income - total_expense;
  const savings_rate = total_income > 0 ? Math.round((balance / total_income) * 100) : 0;

  return {
    month,
    year,
    total_income,
    total_expense,
    balance,
    savings_rate,
    member_breakdown: [
      {
        member_id: 'husband',
        total: memberExpenseMap.husband,
        percentage: total_expense > 0 ? Math.round((memberExpenseMap.husband / total_expense) * 100) : 0
      },
      {
        member_id: 'wife',
        total: memberExpenseMap.wife,
        percentage: total_expense > 0 ? Math.round((memberExpenseMap.wife / total_expense) * 100) : 0
      }
    ],
    transaction_count: monthTxs.length
  };
}

console.log('=== KIỂM THỬ TỰ ĐỘNG DASHBOARD (SPEC MỤC 48) ===\n');

// Dữ liệu kiểm thử theo đặc tả:
// Thu: 20.000.000đ (tháng 9/2026)
// Chi: 2.000.000đ (tháng 9/2026, Chồng)
// Chi: 3.000.000đ (tháng 9/2026, Vợ)
// Ngoài ra thêm 1 giao dịch ngày 31/08/2026: Chi 5.000.000đ để test ranh giới tháng!
const mockData = [
  { id: '1', date: '2026-09-01', type: 'income', amount: 20000000, category_id: 'salary', member_id: 'husband', deleted: false },
  { id: '2', date: '2026-09-02', type: 'expense', amount: 2000000, category_id: 'food', member_id: 'husband', deleted: false },
  { id: '3', date: '2026-09-03', type: 'expense', amount: 3000000, category_id: 'children', member_id: 'wife', deleted: false },
  // Transaction ở tháng 8 (31/08/2026)
  { id: '4', date: '2026-08-31', type: 'expense', amount: 5000000, category_id: 'shopping', member_id: 'wife', deleted: false },
  // Transaction bị soft-deleted
  { id: '5', date: '2026-09-04', type: 'expense', amount: 1000000, category_id: 'food', member_id: 'husband', deleted: true },
];

const resSep = calculateDashboardSummary(mockData, 2026, 9);
console.log('Kết quả tính toán Tháng 9/2026:');
console.log('  - Tổng thu:', resSep.total_income.toLocaleString('vi-VN'), '₫');
console.log('  - Tổng chi:', resSep.total_expense.toLocaleString('vi-VN'), '₫');
console.log('  - Số dư còn lại:', resSep.balance.toLocaleString('vi-VN'), '₫');
console.log('  - Tỷ lệ tiết kiệm:', resSep.savings_rate, '%');
console.log('  - Chồng chi:', resSep.member_breakdown[0].total.toLocaleString('vi-VN'), '₫ (' + resSep.member_breakdown[0].percentage + '%)');
console.log('  - Vợ chi:', resSep.member_breakdown[1].total.toLocaleString('vi-VN'), '₫ (' + resSep.member_breakdown[1].percentage + '%)');

// Assertions
let passed = true;
if (resSep.total_income !== 20000000) {
  console.error('❌ LỖI: Tổng thu phải là 20.000.000');
  passed = false;
}
if (resSep.total_expense !== 5000000) {
  console.error('❌ LỖI: Tổng chi phải là 5.000.000 (đã loại trừ 31/08 và deleted)');
  passed = false;
}
if (resSep.balance !== 15000000) {
  console.error('❌ LỖI: Số dư phải là 15.000.000');
  passed = false;
}
if (resSep.transaction_count !== 3) {
  console.error('❌ LỖI: Số lượng giao dịch hợp lệ của tháng 9 phải là 3');
  passed = false;
}

// Kiểm tra Tháng 8
const resAug = calculateDashboardSummary(mockData, 2026, 8);
if (resAug.total_expense !== 5000000) {
  console.error('❌ LỖI: Giao dịch ngày 31/08 phải thuộc về Tháng 8');
  passed = false;
}

if (passed) {
  console.log('\n✔ TẤT CẢ TEST CASES CHO DASHBOARD ĐÃ CHÍNH XÁC 100%!');
} else {
  process.exit(1);
}
