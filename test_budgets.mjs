// Test script for Budget & Reports logic (Milestone 4)

function evaluateBudget(amount, spent) {
  const percent = amount > 0 ? Math.round((spent / amount) * 100) : 0;
  let status = 'normal';
  if (percent >= 100) {
    status = 'exceeded';
  } else if (percent >= 80) {
    status = 'warning';
  }
  return {
    amount,
    spent,
    remaining: Math.max(0, amount - spent),
    over: Math.max(0, spent - amount),
    percent,
    status
  };
}

function evaluateMonthComparison(currentExpense, previousExpense) {
  const diff = currentExpense - previousExpense;
  const percent = previousExpense > 0 ? Math.round((diff / previousExpense) * 100) : 0;
  return { diff, percent };
}

console.log('=== KIỂM THỬ TỰ ĐỘNG NGÂN SÁCH & BÁO CÁO (MILESTONE 4) ===\n');

// 1. Kiểm thử mức <80% (Bình thường)
const b1 = evaluateBudget(5000000, 3500000);
console.log('1. Ngân sách 5tr, Chi 3.5tr: % =', b1.percent, 'Trạng thái =', b1.status);
if (b1.status !== 'normal' || b1.percent !== 70 || b1.remaining !== 1500000) {
  console.error('❌ Lỗi kiểm thử mức bình thường');
  process.exit(1);
}

// 2. Kiểm thử mức 80-99% (Cảnh báo)
const b2 = evaluateBudget(5000000, 4200000);
console.log('2. Ngân sách 5tr, Chi 4.2tr: % =', b2.percent, 'Trạng thái =', b2.status);
if (b2.status !== 'warning' || b2.percent !== 84 || b2.remaining !== 800000) {
  console.error('❌ Lỗi kiểm thử mức cảnh báo');
  process.exit(1);
}

// 3. Kiểm thử mức >=100% (Vượt ngân sách)
const b3 = evaluateBudget(5000000, 5200000);
console.log('3. Ngân sách 5tr, Chi 5.2tr: % =', b3.percent, 'Trạng thái =', b3.status, 'Vượt =', b3.over);
if (b3.status !== 'exceeded' || b3.percent !== 104 || b3.over !== 200000) {
  console.error('❌ Lỗi kiểm thử mức vượt ngân sách');
  process.exit(1);
}

// 4. So sánh tháng trước
const comp = evaluateMonthComparison(18450000, 15000000);
console.log('4. Chi tháng này 18.45tr vs Chi tháng trước 15tr: Tăng', comp.diff.toLocaleString('vi-VN'), '₫ (' + comp.percent + '%)');
if (comp.diff !== 3450000 || comp.percent !== 23) {
  console.error('❌ Lỗi kiểm thử so sánh tháng');
  process.exit(1);
}

console.log('\n✔ TẤT CẢ TEST CASES CHO NGÂN SÁCH & BÁO CÁO ĐÃ ĐẠT 100%!');
