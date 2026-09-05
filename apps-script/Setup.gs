/**
 * GOOGLE SHEETS SCHEMA INITIALIZER
 * Chạy hàm `setupDatabase()` này một lần đầu tiên để tạo cấu trúc 6 Sheet và dữ liệu ban đầu.
 */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Transactions Sheet
  setupSheet(ss, 'Transactions', [
    'id', 'date', 'type', 'amount', 'category_id', 'member_id', 'account_id', 'note', 'created_at', 'updated_at', 'deleted'
  ]);

  // 2. Categories Sheet
  const catSheet = setupSheet(ss, 'Categories', [
    'id', 'name', 'type', 'icon', 'sort_order', 'active'
  ]);
  if (catSheet.getLastRow() <= 1) {
    const defaultCategories = [
      // Chi tiêu
      ['food', 'Ăn uống', 'expense', 'Utensils', 1, true],
      ['home', 'Nhà cửa', 'expense', 'Home', 2, true],
      ['transport', 'Đi lại', 'expense', 'Car', 3, true],
      ['children', 'Con cái', 'expense', 'Baby', 4, true],
      ['shopping', 'Mua sắm', 'expense', 'ShoppingBag', 5, true],
      ['health', 'Sức khỏe', 'expense', 'HeartPulse', 6, true],
      ['utilities', 'Điện nước / Internet', 'expense', 'Zap', 7, true],
      ['entertainment', 'Giải trí', 'expense', 'Film', 8, true],
      ['education', 'Học tập', 'expense', 'BookOpen', 9, true],
      ['family', 'Gia đình / Hiếu hỉ', 'expense', 'Users', 10, true],
      ['other_expense', 'Chi tiêu khác', 'expense', 'MoreHorizontal', 11, true],
      // Thu nhập
      ['salary', 'Tiền lương', 'income', 'Briefcase', 1, true],
      ['bonus', 'Tiền thưởng', 'income', 'Gift', 2, true],
      ['business', 'Kinh doanh', 'income', 'TrendingUp', 3, true],
      ['side_income', 'Thu nhập thêm', 'income', 'Coins', 4, true],
      ['other_income', 'Thu nhập khác', 'income', 'Wallet', 5, true]
    ];
    catSheet.getRange(2, 1, defaultCategories.length, 6).setValues(defaultCategories);
  }

  // 3. Members Sheet
  const memberSheet = setupSheet(ss, 'Members', [
    'id', 'name', 'email', 'role', 'active'
  ]);
  if (memberSheet.getLastRow() <= 1) {
    const defaultMembers = [
      ['husband', 'Chồng', '', 'owner', true],
      ['wife', 'Vợ', '', 'member', true]
    ];
    memberSheet.getRange(2, 1, defaultMembers.length, 5).setValues(defaultMembers);
  }

  // 4. Accounts Sheet
  const accountSheet = setupSheet(ss, 'Accounts', [
    'id', 'name', 'type', 'opening_balance', 'active', 'sort_order'
  ]);
  if (accountSheet.getLastRow() <= 1) {
    const defaultAccounts = [
      ['cash', 'Tiền mặt', 'cash', 0, true, 1],
      ['bank_husband', 'Ngân hàng Chồng', 'bank', 0, true, 2],
      ['bank_wife', 'Ngân hàng Vợ', 'bank', 0, true, 3],
      ['shared_bank', 'Tài khoản chung', 'bank', 0, true, 4]
    ];
    accountSheet.getRange(2, 1, defaultAccounts.length, 6).setValues(defaultAccounts);
  }

  // 5. Budgets Sheet
  setupSheet(ss, 'Budgets', [
    'id', 'year', 'month', 'category_id', 'amount', 'created_at', 'updated_at'
  ]);

  // 6. Settings Sheet
  const settingsSheet = setupSheet(ss, 'Settings', ['key', 'value']);
  if (settingsSheet.getLastRow() <= 1) {
    const defaultSettings = [
      ['family_name', 'Sổ Chi Tiêu Gia Đình'],
      ['currency', 'VND'],
      ['timezone', 'Asia/Bangkok'],
      ['locale', 'vi-VN'],
      ['schema_version', '1']
    ];
    settingsSheet.getRange(2, 1, defaultSettings.length, 2).setValues(defaultSettings);
  }

  // Delete default "Sheet1" or "Trang tính 1" if other sheets exist
  const sheet1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính 1');
  if (sheet1 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(sheet1);
    } catch (e) {
      // ignore
    }
  }

  Logger.log('Đã khởi tạo xong Database với đầy đủ 6 Sheet và dữ liệu ban đầu!');
}

function setupSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Ensure header row exists
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  // Style header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#059669'); // Emerald 600
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  return sheet;
}
