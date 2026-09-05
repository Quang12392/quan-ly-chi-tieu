/**
 * ============================================================================
 * SỔ CHI TIÊU GIA ĐÌNH - GOOGLE APPS SCRIPT BACKEND (ALL-IN-ONE)
 * Toàn bộ mã nguồn backend được gộp trong 1 file duy nhất để dễ dàng triển khai.
 * ============================================================================
 */

// ============================================================================
// PHẦN 1: ROUTER CHÍNH (Code.gs)
// ============================================================================

function doGet(e) {
  return successResponse({
    status: 'online',
    app: 'Family Expense Manager API',
    time: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    let requestData = {};
    if (e && e.postData && e.postData.contents) {
      requestData = JSON.parse(e.postData.contents);
    }

    const action = requestData.action;
    const payload = requestData.payload || {};

    switch (action) {
      case 'getBootstrapData':
        return handleGetBootstrapData();

      case 'getTransactions':
        return handleGetTransactions(payload);

      case 'createTransaction':
        return handleCreateTransaction(payload);

      case 'updateTransaction':
        return handleUpdateTransaction(payload);

      case 'deleteTransaction':
        return handleDeleteTransaction(payload);

      case 'getCategories':
        return handleGetCategories();

      case 'createCategory':
        return handleCreateCategory(payload);

      case 'updateCategory':
        return handleUpdateCategory(payload);

      case 'getBudgets':
        return handleGetBudgets(payload);

      case 'saveBudget':
        return handleSaveBudget(payload);

      case 'getDashboardSummary':
        return handleGetDashboardSummary(payload);

      case 'ping':
        return successResponse({ pong: true, time: new Date().toISOString() });

      default:
        return errorResponse('Hành động (action) không được hỗ trợ: ' + action, 'INVALID_ACTION');
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return errorResponse(error.message || 'Lỗi xử lý yêu cầu máy chủ', 'SERVER_ERROR');
  }
}

// ============================================================================
// PHẦN 2: CÔNG CỤ & TIỆN ÍCH (Utils.gs)
// ============================================================================

function generateUUID() {
  return 'tx_' + Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function successResponse(data) {
  return jsonResponse({
    ok: true,
    data: data
  });
}

function errorResponse(message, code) {
  return jsonResponse({
    ok: false,
    error: {
      code: code || 'ERROR',
      message: message || 'Đã có lỗi xảy ra'
    }
  });
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const rows = data.slice(1);

  return rows.map(row => {
    const item = {};
    headers.forEach((header, colIndex) => {
      let val = row[colIndex];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd');
      }
      item[header] = val;
    });
    return item;
  });
}

function getHeaderIndexMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, idx) => {
    map[String(h).trim().toLowerCase()] = idx + 1;
  });
  return map;
}

// ============================================================================
// PHẦN 3: KHỞI TẠO BẢNG TÍNH (Setup.gs)
// CHẠY HÀM setupDatabase() 1 LẦN ĐẦU TIÊN ĐỂ TỰ ĐỘNG TẠO 6 SHEET VÀ DỮ LIỆU GỐC
// ============================================================================

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

  // Xóa Sheet1 hoặc Trang tính 1 mặc định nếu đã có các Sheet khác
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

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#059669'); // Emerald 600
  headerRange.setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  return sheet;
}

// ============================================================================
// PHẦN 4: QUẢN LÝ GIAO DỊCH (Transactions.gs)
// ============================================================================

function handleGetTransactions(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Transactions');
  if (!sheet) return successResponse([]);

  const list = sheetToObjects(sheet);
  const filtered = list.filter(item => {
    if (item.deleted === true || String(item.deleted).toLowerCase() === 'true') {
      return false;
    }
    if (payload.from && item.date < payload.from) return false;
    if (payload.through && item.date > payload.through) return false;
    if (payload.type && item.type !== payload.type) return false;
    if (payload.category_id && item.category_id !== payload.category_id) return false;
    if (payload.member_id && item.member_id !== payload.member_id) return false;
    return true;
  });

  filtered.sort((a, b) => {
    return String(b.date).localeCompare(String(a.date)) || 
           String(b.created_at).localeCompare(String(a.created_at));
  });

  return successResponse(filtered);
}

function handleCreateTransaction(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return errorResponse('Hệ thống đang bận, vui lòng thử lại sau vài giây', 'LOCKED');
  }

  try {
    const amount = Number(payload.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      return errorResponse('Số tiền phải là số dương lớn hơn 0', 'INVALID_AMOUNT');
    }
    if (!payload.date || !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
      return errorResponse('Ngày giao dịch không hợp lệ (định dạng YYYY-MM-DD)', 'INVALID_DATE');
    }
    if (!['expense', 'income'].includes(payload.type)) {
      return errorResponse('Loại giao dịch phải là expense hoặc income', 'INVALID_TYPE');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) {
      return errorResponse('Bảng Transactions không tồn tại. Vui lòng chạy setupDatabase trước.', 'SHEET_NOT_FOUND');
    }

    const id = generateUUID();
    const now = new Date().toISOString();
    const headerMap = getHeaderIndexMap(sheet);

    const newTx = {
      id: id,
      date: payload.date,
      type: payload.type,
      amount: amount,
      category_id: payload.category_id || '',
      member_id: payload.member_id || 'husband',
      account_id: payload.account_id || '',
      note: payload.note || '',
      created_at: now,
      updated_at: now,
      deleted: false
    };

    const rowData = new Array(sheet.getLastColumn()).fill('');
    Object.keys(newTx).forEach(key => {
      const colIdx = headerMap[key];
      if (colIdx) {
        rowData[colIdx - 1] = newTx[key];
      }
    });

    sheet.appendRow(rowData);
    return successResponse(newTx);
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateTransaction(payload) {
  if (!payload.id) {
    return errorResponse('Thiếu transaction ID', 'MISSING_ID');
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return errorResponse('Hệ thống đang bận, vui lòng thử lại', 'LOCKED');
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) return errorResponse('Bảng Transactions không tồn tại', 'SHEET_NOT_FOUND');

    const data = sheet.getDataRange().getValues();
    const headerMap = getHeaderIndexMap(sheet);
    const idColIdx = headerMap['id'];

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColIdx - 1] === payload.id) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return errorResponse('Không tìm thấy giao dịch với ID đã cho', 'NOT_FOUND');
    }

    const now = new Date().toISOString();
    payload.updated_at = now;

    Object.keys(payload).forEach(key => {
      const colIdx = headerMap[key];
      if (colIdx && key !== 'id') {
        sheet.getRange(targetRow, colIdx).setValue(payload[key]);
      }
    });

    return successResponse({ id: payload.id, updated: true });
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteTransaction(payload) {
  if (!payload.id) {
    return errorResponse('Thiếu transaction ID', 'MISSING_ID');
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return errorResponse('Hệ thống đang bận', 'LOCKED');
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Transactions');
    if (!sheet) return errorResponse('Bảng Transactions không tồn tại', 'SHEET_NOT_FOUND');

    const data = sheet.getDataRange().getValues();
    const headerMap = getHeaderIndexMap(sheet);
    const idColIdx = headerMap['id'];
    const deletedColIdx = headerMap['deleted'];
    const updatedColIdx = headerMap['updated_at'];

    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idColIdx - 1] === payload.id) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return errorResponse('Không tìm thấy giao dịch để xóa', 'NOT_FOUND');
    }

    // Soft delete
    sheet.getRange(targetRow, deletedColIdx).setValue(true);
    if (updatedColIdx) {
      sheet.getRange(targetRow, updatedColIdx).setValue(new Date().toISOString());
    }

    return successResponse({ id: payload.id, deleted: true });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// PHẦN 5: QUẢN LÝ DANH MỤC (Categories.gs)
// ============================================================================

function handleGetCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Categories');
  if (!sheet) return successResponse([]);

  const list = sheetToObjects(sheet);
  list.sort((a, b) => (Number(a.sort_order) || 99) - (Number(b.sort_order) || 99));

  return successResponse(list);
}

function handleCreateCategory(payload) {
  if (!payload.name) {
    return errorResponse('Tên danh mục không được để trống', 'INVALID_NAME');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Categories');
  if (!sheet) return errorResponse('Bảng Categories không tồn tại', 'SHEET_NOT_FOUND');

  const id = payload.id || 'cat_' + Date.now();
  const headerMap = getHeaderIndexMap(sheet);

  const newCat = {
    id: id,
    name: payload.name.trim(),
    type: payload.type || 'expense',
    icon: payload.icon || 'Tag',
    sort_order: Number(payload.sort_order) || sheet.getLastRow(),
    active: payload.active !== undefined ? payload.active : true
  };

  const rowData = new Array(sheet.getLastColumn()).fill('');
  Object.keys(newCat).forEach(key => {
    const colIdx = headerMap[key];
    if (colIdx) rowData[colIdx - 1] = newCat[key];
  });

  sheet.appendRow(rowData);
  return successResponse(newCat);
}

function handleUpdateCategory(payload) {
  if (!payload.id) {
    return errorResponse('Thiếu category ID', 'MISSING_ID');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Categories');
  if (!sheet) return errorResponse('Bảng Categories không tồn tại', 'SHEET_NOT_FOUND');

  const data = sheet.getDataRange().getValues();
  const headerMap = getHeaderIndexMap(sheet);
  const idColIdx = headerMap['id'];

  let targetRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx - 1]) === String(payload.id)) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow === -1) {
    return errorResponse('Không tìm thấy danh mục để cập nhật', 'NOT_FOUND');
  }

  Object.keys(payload).forEach(key => {
    const colIdx = headerMap[key];
    if (colIdx && key !== 'id') {
      sheet.getRange(targetRow, colIdx).setValue(payload[key]);
    }
  });

  return successResponse({ id: payload.id, updated: true });
}

// ============================================================================
// PHẦN 6: QUẢN LÝ NGÂN SÁCH (Budgets.gs)
// ============================================================================

function handleGetBudgets(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Budgets');
  if (!sheet) return successResponse([]);

  const list = sheetToObjects(sheet);
  const year = Number(payload.year);
  const month = Number(payload.month);

  const filtered = list.filter(b => {
    return (!year || Number(b.year) === year) && (!month || Number(b.month) === month);
  });

  return successResponse(filtered);
}

function handleSaveBudget(payload) {
  const year = Number(payload.year);
  const month = Number(payload.month);
  const amount = Number(payload.amount);
  const categoryId = String(payload.category_id);

  if (!year || !month || !categoryId || isNaN(amount)) {
    return errorResponse('Thông tin ngân sách không hợp lệ', 'INVALID_INPUT');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Budgets');
  if (!sheet) return errorResponse('Bảng Budgets không tồn tại', 'SHEET_NOT_FOUND');

  const data = sheet.getDataRange().getValues();
  const headerMap = getHeaderIndexMap(sheet);
  const yearIdx = headerMap['year'];
  const monthIdx = headerMap['month'];
  const catIdx = headerMap['category_id'];
  const amtIdx = headerMap['amount'];
  const updateIdx = headerMap['updated_at'];

  const now = new Date().toISOString();
  let targetRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][yearIdx - 1]) === year &&
        Number(data[i][monthIdx - 1]) === month &&
        String(data[i][catIdx - 1]) === categoryId) {
      targetRow = i + 1;
      break;
    }
  }

  if (targetRow !== -1) {
    sheet.getRange(targetRow, amtIdx).setValue(amount);
    if (updateIdx) sheet.getRange(targetRow, updateIdx).setValue(now);
    return successResponse({ id: data[targetRow - 1][headerMap['id'] - 1], year, month, category_id: categoryId, amount });
  } else {
    const id = 'b_' + year + '_' + month + '_' + categoryId;
    const newBudget = {
      id: id,
      year: year,
      month: month,
      category_id: categoryId,
      amount: amount,
      created_at: now,
      updated_at: now
    };

    const rowData = new Array(sheet.getLastColumn()).fill('');
    Object.keys(newBudget).forEach(key => {
      const colIdx = headerMap[key];
      if (colIdx) rowData[colIdx - 1] = newBudget[key];
    });

    sheet.appendRow(rowData);
    return successResponse(newBudget);
  }
}

// ============================================================================
// PHẦN 7: DỮ LIỆU TỔNG QUAN (Dashboard.gs)
// ============================================================================

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

  const settings = {};
  if (settingsSheet) {
    const rawSettings = sheetToObjects(settingsSheet);
    rawSettings.forEach(s => {
      if (s.key) settings[s.key] = s.value;
    });
  }

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

  const recent_transactions = monthTxs.slice().sort((a, b) => {
    return String(b.date).localeCompare(String(a.date)) ||
           String(b.created_at).localeCompare(String(a.created_at));
  }).slice(0, 10);

  const membersSheet = ss.getSheetByName('Members');
  const budgetSheet = ss.getSheetByName('Budgets');
  const members = membersSheet ? sheetToObjects(membersSheet) : [];
  const budgets = budgetSheet ? sheetToObjects(budgetSheet) : [];

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

  const monthBudgets = budgets.filter(b => Number(b.year) === year && Number(b.month) === month);
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
