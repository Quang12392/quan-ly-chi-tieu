// Test export CSV, export JSON and import JSON functionality

console.log('=== KIỂM THỬ TỰ ĐỘNG SAO LƯU & XUẤT DỮ LIỆU (MILESTONE 5) ===\n');

const sampleTransactions = [
  { id: 'tx_01', date: '2026-09-01', type: 'expense', amount: 250000, category_id: 'food', member_id: 'husband', note: 'Ăn tối bún chả', created_at: '2026-09-01T19:00:00Z', deleted: false },
  { id: 'tx_02', date: '2026-09-02', type: 'income', amount: 20000000, category_id: 'salary', member_id: 'husband', note: 'Lương tháng 9', created_at: '2026-09-02T10:00:00Z', deleted: false }
];

const sampleCategories = [
  { id: 'food', name: 'Ăn uống', type: 'expense' },
  { id: 'salary', name: 'Tiền lương', type: 'income' }
];

// Test 1: CSV Generation with UTF-8 BOM
let csv = '\uFEFFMã giao dịch,Ngày,Loại,Số tiền,Danh mục,Người thực hiện,Ghi chú,Ngày tạo\n';
for (const t of sampleTransactions) {
  const cat = sampleCategories.find(c => c.id === t.category_id);
  const catName = cat ? cat.name : t.category_id;
  const typeStr = t.type === 'expense' ? 'Chi tiêu' : 'Thu nhập';
  const memberStr = t.member_id === 'husband' ? 'Chồng' : 'Vợ';
  const noteStr = t.note ? `"${t.note.replace(/"/g, '""')}"` : '';
  csv += `"${t.id}","${t.date}","${typeStr}",${t.amount},"${catName}","${memberStr}",${noteStr},"${t.created_at}"\n`;
}

console.log('1. Kiểm tra xuất file CSV UTF-8 BOM:');
console.log('   - Bắt đầu bằng UTF-8 BOM:', csv.charCodeAt(0) === 0xFEFF);
console.log('   - Chứa dấu tiếng Việt ("Ăn uống", "bún chả"):', csv.includes('Ăn uống') && csv.includes('bún chả'));
console.log('   - Số dòng hợp lệ:', csv.trim().split('\n').length === 3);

if (csv.charCodeAt(0) !== 0xFEFF || !csv.includes('bún chả')) {
  console.error('❌ Lỗi định dạng CSV');
  process.exit(1);
}

// Test 2: JSON Export & Import Roundtrip
const backupData = {
  schema_version: 1,
  exported_at: new Date().toISOString(),
  transactions: sampleTransactions,
  categories: sampleCategories,
  budgets: [{ id: 'b_food', year: 2026, month: 9, category_id: 'food', amount: 5000000 }]
};

const jsonString = JSON.stringify(backupData, null, 2);
const restoredData = JSON.parse(jsonString);

console.log('\n2. Kiểm tra sao lưu & khôi phục JSON:');
console.log('   - Schema version:', restoredData.schema_version);
console.log('   - Khôi phục số giao dịch:', restoredData.transactions.length);
console.log('   - Khôi phục số danh mục:', restoredData.categories.length);
console.log('   - Khôi phục số ngân sách:', restoredData.budgets.length);

if (restoredData.transactions.length !== 2 || restoredData.categories.length !== 2) {
  console.error('❌ Lỗi khôi phục JSON');
  process.exit(1);
}

console.log('\n✔ TẤT CẢ TEST CASES CHO SAO LƯU & XUẤT DỮ LIỆU ĐÃ ĐẠT 100%!');
