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
    const optimized = dispatchStorageApi(action, payload);
    if (optimized !== null) return successResponse(optimized);

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
        val = headers[colIndex] === 'date'
          ? Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd')
          : val.toISOString();
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
  const list = readReference_('Categories', 300);
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
  invalidateReference_('Categories');
  touchDataRevision_();
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

  invalidateReference_('Categories');
  touchDataRevision_();
  return successResponse({ id: payload.id, updated: true });
}

// ============================================================================
// PHẦN 6: QUẢN LÝ NGÂN SÁCH (Budgets.gs)
// ============================================================================

function handleGetBudgets(payload) {
  const list = readReference_('Budgets', 300);
  const year = Number(payload.year);
  const month = Number(payload.month);

  if (!year || !month) {
    return successResponse(list);
  }

  return successResponse(resolveBudgets(list, year, month));
}

// Resolve each category independently, including across year boundaries.
function resolveBudgets(budgets, year, month) {
  const latest = new Map();
  budgets.forEach(budget => {
    const period = Number(budget.year) * 12 + Number(budget.month);
    if (period > year * 12 + month) return;
    const previous = latest.get(budget.category_id);
    if (!previous || period >= Number(previous.year) * 12 + Number(previous.month)) {
      latest.set(budget.category_id, budget);
    }
  });
  // Zero marks a disabled budget and must block older inherited limits.
  return Array.from(latest.values()).filter(budget => Number(budget.amount) > 0).map(budget => ({
    ...budget,
    amount: Number(budget.amount),
    id: 'b_' + year + '_' + month + '_' + budget.category_id,
    year: year,
    month: month,
    inherited_from: Number(budget.year) === year && Number(budget.month) === month
      ? undefined : budget.month + '/' + budget.year
  }));
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
    invalidateReference_('Budgets');
    touchDataRevision_();
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
    invalidateReference_('Budgets');
    touchDataRevision_();
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

  const monthBudgets = resolveBudgets(budgets, year, month);
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

// ============================================================================
// STORAGE V2: yearly detail, monthly aggregates, bounded history and safe migration
// Functions ending in _ are editor-only helpers, not public API routes.
// ============================================================================
const TX_COLUMNS = ['id','date','type','amount','category_id','member_id','account_id','note','created_at','updated_at','deleted'];
const SUMMARY_COLUMNS = ['year','month','income','expense','categories','members','count'];
const API_CACHE_VERSION = 'v1';
function storageProps_() { return PropertiesService.getScriptProperties(); }
function partitioned_() { return storageProps_().getProperty('storage_version') === '2'; }
function cacheReadJson_(key) {
  try {
    const value=CacheService.getScriptCache().get(key);
    return value===null ? null : JSON.parse(value);
  } catch (_) { return null; }
}
function cacheWriteJson_(key,value,seconds) {
  try {
    const encoded=JSON.stringify(value);
    if(encoded.length<90000)CacheService.getScriptCache().put(key,encoded,seconds);
  } catch (_) { /* Cache is optional; Sheets remains the source of truth. */ }
}
function referenceCacheKey_(name) { return 'reference-'+API_CACHE_VERSION+'-'+name; }
function readReference_(name,seconds) {
  const key=referenceCacheKey_(name),cached=cacheReadJson_(key);
  if(cached!==null)return cached;
  const rows=readNamed_(name);
  cacheWriteJson_(key,rows,seconds);
  return rows;
}
function invalidateReference_(name) {
  try { CacheService.getScriptCache().remove(referenceCacheKey_(name)); } catch (_) {}
}
function touchDataRevision_() { storageProps_().setProperty('data_revision', Utilities.getUuid()); }
function hashText_(value) {
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return (hash>>>0).toString(16);
}
function apiResponseCacheKey_(action,payload) {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  const names=partitioned_()
    ? (action==='getDashboardSummary' ? ['Transactions_'+Number(payload.year)] : yearSheets_())
    : ['Transactions'];
  const shape=names.map(name=>{const sheet=ss.getSheetByName(name);return name+':'+(sheet?sheet.getLastRow():0);}).join('|');
  const revision=storageProps_().getProperty('data_revision')||'initial';
  return 'response-'+API_CACHE_VERSION+'-'+action+'-'+revision+'-'+hashText_(shape)+'-'+Number(payload.year)+'-'+Number(payload.month);
}
function readApiResponseCache_(action,payload) {
  if(!['getDashboardSummary','getReportBundle'].includes(action))return null;
  if(storageProps_().getProperty('pending_transaction'))return null;
  return cacheReadJson_(apiResponseCacheKey_(action,payload));
}
function writeApiResponseCache_(action,payload,value) {
  if(!['getDashboardSummary','getReportBundle'].includes(action))return;
  cacheWriteJson_(apiResponseCacheKey_(action,payload),value,action==='getDashboardSummary'?90:180);
}
function readNamed_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  return sheet ? sheetToObjects(sheet).filter(r => r.id || r.year || r.key) : [];
}
function activeTx_(t) { return t.deleted !== true && String(t.deleted).toLowerCase() !== 'true'; }
function txSort_(a,b) { return String(b.date).localeCompare(String(a.date)) || String(b.created_at).localeCompare(String(a.created_at)) || String(b.id).localeCompare(String(a.id)); }
function validDate_(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return false;
  const d = new Date(date + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0,10) === date;
}
function validateTx_(t) {
  if (!t.id || !validDate_(t.date) || !['income','expense'].includes(t.type) || !Number.isSafeInteger(Number(t.amount)) || Number(t.amount) <= 0) throw new Error('Giao dịch không hợp lệ: ' + (t.id || 'thiếu mã'));
  if (!['husband','wife'].includes(t.member_id)) throw new Error('Thành viên không hợp lệ');
}
function yearSheets_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().map(s => s.getName()).filter(n => /^Transactions_\d{4}$/.test(n)).sort().reverse();
}
function ensureYear_(year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = 'Transactions_' + year;
  const sheet=ss.getSheetByName(name);
  return sheet && sheet.getLastRow()>0 ? sheet : setupSheet(ss, name, TX_COLUMNS);
}
function markDirty_(years) {
  const p = storageProps_();
  const dirty = JSON.parse(p.getProperty('dirty_years') || '[]');
  p.setProperty('dirty_years', JSON.stringify(Array.from(new Set(dirty.concat(years.map(Number))))));
  touchDataRevision_();
}
function aggregateMonths_(txs, year) {
  const months = Array.from({length:12}, (_,i) => ({year:Number(year),month:i+1,income:0,expense:0,categories:{},members:{},count:0}));
  txs.forEach(t => {
    if (!activeTx_(t) || Number(String(t.date).slice(0,4)) !== Number(year)) return;
    validateTx_(t);
    const m = months[Number(t.date.slice(5,7))-1], amount = Number(t.amount);
    m[t.type] += amount; m.count++;
    // Include income as well as expense for future category/member comparisons.
    const cat = m.categories[t.category_id] || (m.categories[t.category_id] = {income:0,expense:0});
    const member = m.members[t.member_id] || (m.members[t.member_id] = {income:0,expense:0});
    cat[t.type] += amount; member[t.type] += amount;
  });
  return months;
}
function writeSummaryYear_(year, txs) {
  if(txs.some(t=>activeTx_(t)&&Number(String(t.date).slice(0,4))!==Number(year))) throw new Error('Có giao dịch sai năm trong Transactions_'+year+'. Hãy sửa ngày hoặc chuyển giao dịch bằng ứng dụng rồi tính lại báo cáo.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('MonthlySummary');
  if(!sheet||sheet.getLastRow()===0)sheet=setupSheet(ss,'MonthlySummary',SUMMARY_COLUMNS);
  const existing = readNamed_('MonthlySummary').filter(r => Number(r.year) !== Number(year));
  const rows = existing.concat(aggregateMonths_(txs,year)).sort((a,b)=>a.year-b.year || a.month-b.month);
  const values = rows.map(r => [Number(r.year),Number(r.month),Number(r.income),Number(r.expense),typeof r.categories === 'string' ? r.categories : JSON.stringify(r.categories),typeof r.members === 'string' ? r.members : JSON.stringify(r.members),Number(r.count)]);
  if (sheet.getMaxRows() < values.length+1) sheet.insertRowsAfter(sheet.getMaxRows(), values.length+1-sheet.getMaxRows());
  // Fixed 12 rows per year, upsert does not shrink the table.
  if (values.length) sheet.getRange(2,1,values.length,SUMMARY_COLUMNS.length).setValues(values);
  SpreadsheetApp.flush();
  const detail=ss.getSheetByName('Transactions_'+year);
  storageProps_().setProperty('detail_rows_'+year,String(detail?detail.getLastRow():0));
}
function summaries_() {
  if (!partitioned_()) {
    const all = readNamed_('Transactions');
    const years = Array.from(new Set(all.filter(t=>validDate_(t.date)).map(t=>Number(t.date.slice(0,4)))));
    return years.flatMap(y=>aggregateMonths_(all,y));
  }
  const p = storageProps_();
  const rows = readNamed_('MonthlySummary');
  const dirty = new Set(JSON.parse(p.getProperty('dirty_years') || '[]'));
  yearSheets_().forEach(name => {
    const year = Number(name.slice(-4));
    const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if (rows.filter(r=>Number(r.year)===year).length !== 12 || p.getProperty('detail_rows_'+year)!==String(sheet.getLastRow())) dirty.add(year);
  });
  const existingYears=new Set(yearSheets_().map(n=>Number(n.slice(-4))));
  rows.forEach(r=>{if(!existingYears.has(Number(r.year)) && Number(r.count)>0)dirty.add(Number(r.year));});
  for (const year of dirty) {
    writeSummaryYear_(year,readNamed_('Transactions_'+year));
    const remaining = JSON.parse(p.getProperty('dirty_years') || '[]').filter(y=>Number(y)!==Number(year));
    p.setProperty('dirty_years',JSON.stringify(remaining));
  }
  return (dirty.size ? readNamed_('MonthlySummary') : rows).map(r=>({...r,year:Number(r.year),month:Number(r.month),income:Number(r.income),expense:Number(r.expense),categories:typeof r.categories==='string'?JSON.parse(r.categories):r.categories,members:typeof r.members==='string'?JSON.parse(r.members):r.members}));
}
function dashboardFrom_(rows, year, month, categories, budgets, recent) {
  const m = rows.find(r=>r.year===year && r.month===month) || aggregateMonths_([],year)[month-1];
  const balance = m.income-m.expense;
  const total = resolveBudgets(budgets,year,month).reduce((s,b)=>s+Number(b.amount),0);
  return {year,month,total_income:m.income,total_expense:m.expense,balance,savings_rate:m.income>0?Math.max(0,Math.round(balance/m.income*100)):0,
    budget_summary:{total_budget:total,total_spent:m.expense,remaining:Math.max(0,total-m.expense),percentage:total>0?Math.round(m.expense/total*100):0},
    category_breakdown:Object.keys(m.categories).filter(id=>m.categories[id].expense>0).map(id=>{
      const cat=categories.find(c=>c.id===id), amount=m.categories[id].expense;
      return {category_id:id,category_name:cat?cat.name:id,category_icon:cat?cat.icon:'Tag',total:amount,percentage:m.expense?Math.round(amount/m.expense*100):0};
    }).sort((a,b)=>b.total-a.total),
    member_breakdown:['husband','wife'].map(id=>({member_id:id,member_name:id==='husband'?'Chồng':'Vợ',total_expense:(m.members[id]||{}).expense||0,percentage:m.expense?Math.round(((m.members[id]||{}).expense||0)/m.expense*100):0})),recent_transactions:recent||[]};
}
function validatePeriod_(p) {
  if (!Number.isInteger(Number(p.year)) || Number(p.year)<1900 || Number(p.year)>9999 || !Number.isInteger(Number(p.month)) || p.month<1 || p.month>12) throw new Error('Tháng/năm không hợp lệ');
}
function pageTransactions_(p) {
  if (p.from && !validDate_(p.from) || p.through && !validDate_(p.through)) throw new Error('Khoảng ngày không hợp lệ');
  const rev=storageProps_().getProperty('data_revision')||'initial';
  const cursor=p.cursor?JSON.parse(p.cursor):{offset:0,revision:rev};
  if (cursor.revision!==rev) throw new Error('STALE_PAGE: Dữ liệu đã thay đổi, vui lòng tải lại danh sách.');
  const offset=Number(cursor.offset), limit=Math.min(100,Math.max(1,Number(p.limit)||100));
  if (!Number.isSafeInteger(offset)||offset<0) throw new Error('Trang không hợp lệ');
  const names=partitioned_()?yearSheets_().filter(n=>(!p.from||n.slice(-4)>=p.from.slice(0,4))&&(!p.through||n.slice(-4)<=p.through.slice(0,4))):['Transactions'];
  const cats=p.search?readNamed_('Categories'):[];
  const q=String(p.search||'').trim().toLowerCase();
  let found=[];
  for (const name of names) {
    const matches=readNamed_(name).filter(t=>activeTx_(t)&&(!p.from||t.date>=p.from)&&(!p.through||t.date<=p.through)&&(!p.type||t.type===p.type)&&(!p.category_id||t.category_id===p.category_id)&&(!p.member_id||t.member_id===p.member_id)&&(!q||(String(t.note||'')+' '+((cats.find(c=>c.id===t.category_id)||{}).name||'')).toLowerCase().includes(q))).sort(txSort_);
    found=found.concat(matches);
    if(found.length>offset+limit) break;
  }
  const hasMore=found.length>offset+limit;
  return {items:found.slice(offset,offset+limit),next_cursor:hasMore?JSON.stringify({revision:rev,offset:offset+limit}):null};
}
function upsertTx_(sheet,t) {
  const rows=sheetToObjects(sheet), index=rows.findIndex(r=>r.id===t.id);
  const values=TX_COLUMNS.map(k=>t[k]===undefined?'':t[k]);
  if(index>=0) sheet.getRange(index+2,1,1,TX_COLUMNS.length).setValues([values]); else sheet.appendRow(values);
}
// Durable write intent: interrupted cross-year moves resume before the next API read/write.
function recoverWrite_() {
  const p=storageProps_(), raw=p.getProperty('pending_transaction');
  if(!raw) return;
  const op=JSON.parse(raw), ss=SpreadsheetApp.getActiveSpreadsheet();
  markDirty_(op.years);
  const dest=partitioned_()?ensureYear_(op.tx.date.slice(0,4)):ss.getSheetByName('Transactions');
  upsertTx_(dest,op.tx);
  if(op.old && op.old.sheet!==dest.getName()) {
    upsertTx_(ss.getSheetByName(op.old.sheet),{...op.old.tx,deleted:true,updated_at:op.tx.updated_at});
  }
  SpreadsheetApp.flush();
  p.deleteProperty('pending_transaction');
}
function mutateTx_(action,payload) {
  const p=storageProps_();
  if (p.getProperty('migration_state') && !partitioned_()) throw new Error('Đang chuyển dữ liệu. Vui lòng hoàn tất chuyển đổi trước khi nhập thêm.');
  let old=null;
  if(action!=='createTransaction') {
    const names=partitioned_()?yearSheets_():['Transactions'];
    if(payload.original_year) names.sort((a,b)=>Number(b.endsWith(String(payload.original_year)))-Number(a.endsWith(String(payload.original_year))));
    for(const name of names) {
      const tx=readNamed_(name).find(t=>t.id===payload.id&&activeTx_(t));
      if(tx) {old={sheet:name,tx};break;}
    }
    if(!old) throw new Error('Không tìm thấy giao dịch');
  }
  const now=new Date().toISOString();
  const tx=action==='createTransaction'?{id:generateUUID(),created_at:now,deleted:false}: {...old.tx};
  const editable=['date','type','amount','category_id','member_id','account_id','note'];
  if(action!=='deleteTransaction') editable.forEach(k=>{if(payload[k]!==undefined)tx[k]=payload[k];});
  if(action==='deleteTransaction') tx.deleted=true;
  tx.amount=Number(tx.amount); tx.updated_at=now;
  if(String(tx.note||'').length>2000) throw new Error('Ghi chú tối đa 2.000 ký tự');
  validateTx_(tx);
  const op={tx,old,years:Array.from(new Set([Number(tx.date.slice(0,4)),...(old?[Number(old.tx.date.slice(0,4))]:[])]))};
  const encoded=JSON.stringify(op);
  if(Utilities.newBlob(encoded).getBytes().length>8500) throw new Error('Nội dung giao dịch quá dài');
  p.setProperty('pending_transaction',encoded);
  recoverWrite_();
  return tx;
}
function dispatchStorageApi(action,payload) {
  const actions=['getBootstrapData','storageStatus','getReportBundle','getDashboardSummary','getTransactionsPage','getTransactions','createTransaction','updateTransaction','deleteTransaction','rebuildSummaries','exportData'];
  if(!actions.includes(action)) return null;
  const cachedResponse=readApiResponseCache_(action,payload);
  if(cachedResponse!==null)return cachedResponse;
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    recoverWrite_();
    if(action==='storageStatus') return {api_version:2,storage_version:partitioned_()?2:1,backup_url:storageProps_().getProperty('migration_backup_url')||'',migration_pending:!!storageProps_().getProperty('migration_state')&&!partitioned_()};
    if(['createTransaction','updateTransaction','deleteTransaction'].includes(action)) return mutateTx_(action,payload);
    if(action==='getBootstrapData') {
      const now=new Date(),year=now.getFullYear(),month=now.getMonth()+1;
      const prefix=year+'-'+String(month).padStart(2,'0');
      return {categories:readReference_('Categories',300),members:readReference_('Members',300),accounts:readReference_('Accounts',300),settings:Object.fromEntries(readReference_('Settings',300).map(r=>[r.key,r.value])),current_month_transactions:pageTransactions_({from:prefix+'-01',through:prefix+'-'+new Date(Date.UTC(year,month,0)).getUTCDate(),limit:100}).items,current_month_budgets:resolveBudgets(readReference_('Budgets',300),year,month)};
    }
    if(action==='getTransactionsPage') return pageTransactions_(payload);
    if(action==='getTransactions') {
      const names=partitioned_()?yearSheets_().filter(n=>(!payload.from||n.slice(-4)>=String(payload.from).slice(0,4))&&(!payload.through||n.slice(-4)<=String(payload.through).slice(0,4))):['Transactions'];
      return names.flatMap(readNamed_).filter(t=>activeTx_(t)&&(!payload.from||t.date>=payload.from)&&(!payload.through||t.date<=payload.through)&&(!payload.type||t.type===payload.type)&&(!payload.member_id||t.member_id===payload.member_id)&&(!payload.category_id||t.category_id===payload.category_id)).sort(txSort_);
    }
    if(action==='exportData') {
      const byId=new Map();
      (partitioned_()?yearSheets_():['Transactions']).flatMap(readNamed_).forEach(t=>{
        const old=byId.get(t.id);
        if(!old || (activeTx_(t)&&!activeTx_(old)) || (activeTx_(t)===activeTx_(old)&&String(t.updated_at)>String(old.updated_at)))byId.set(t.id,t);
      });
      return {schema_version:2,exported_at:new Date().toISOString(),transactions:Array.from(byId.values()),categories:readNamed_('Categories'),members:readNamed_('Members'),accounts:readNamed_('Accounts'),budgets:readNamed_('Budgets'),settings:Object.fromEntries(readNamed_('Settings').map(r=>[r.key,r.value]))};
    }
    if(action==='rebuildSummaries') {
      const year=Number(payload.year);
      if(!Number.isInteger(year)||year<1900||year>9999) throw new Error('Năm không hợp lệ');
      if(partitioned_()) {markDirty_([year]);summaries_();}
      return {year,recomputed:true};
    }
    validatePeriod_(payload);
    const year=Number(payload.year),month=Number(payload.month);
    const rows=summaries_(),categories=readReference_('Categories',300),budgets=readReference_('Budgets',300);
    if(action==='getDashboardSummary') {
      const prefix=year+'-'+String(month).padStart(2,'0');
      const page=pageTransactions_({from:prefix+'-01',through:prefix+'-'+new Date(Date.UTC(year,month,0)).getUTCDate(),limit:10});
      const result={...dashboardFrom_(rows,year,month,categories,budgets,page.items),categories};
      writeApiResponseCache_(action,payload,result);
      return result;
    }
    const trend=Array.from({length:12},(_,i)=>{const m=rows.find(r=>r.year===year&&r.month===i+1)||{income:0,expense:0};return {year,month:i+1,label:'T'+(i+1),income:m.income,expense:m.expense,balance:m.income-m.expense};});
    const years=Array.from(new Set(rows.map(r=>r.year).concat(year))).sort((a,b)=>a-b).map(y=>{const list=rows.filter(r=>r.year===y);const income=list.reduce((s,r)=>s+r.income,0),expense=list.reduce((s,r)=>s+r.expense,0);return {year:y,income,expense,balance:income-expense};});
    const result={summary:dashboardFrom_(rows,year,month,categories,budgets),previous:dashboardFrom_(rows,month===1?year-1:year,month===1?12:month-1,categories,budgets),categories,budgets:resolveBudgets(budgets,year,month),trend,years};
    writeApiResponseCache_(action,payload,result);
    return result;
  } finally {lock.releaseLock();}
}
// Run from Apps Script editor. Copies the spreadsheet before any migration writes.
// Retry is safe: unchanged source + matching yearly copies are required.
function migrateToYearlyStorage() {
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    const ss=SpreadsheetApp.getActiveSpreadsheet(),p=storageProps_();
    if(partitioned_()) {Logger.log('Đã chuyển đổi trước đó. '+p.getProperty('migration_backup_url'));return;}
    const sourceSheet=ss.getSheetByName('Transactions');
    if(!sourceSheet)throw new Error('Không tìm thấy bảng Transactions gốc');
    const sourceHeaders=sourceSheet.getRange(1,1,1,sourceSheet.getLastColumn()).getValues()[0].map(h=>String(h).trim().toLowerCase());
    if(sourceHeaders.length!==TX_COLUMNS.length||TX_COLUMNS.some(h=>!sourceHeaders.includes(h)))throw new Error('Cấu trúc Transactions khác dự kiến; dừng để kiểm tra trước khi chuyển.');
    const txs=sheetToObjects(sourceSheet).filter(t=>Object.values(t).some(v=>v!==''&&v!==null)),ids=new Set();
    txs.forEach(t=>{validateTx_(t);if(ids.has(t.id))throw new Error('Trùng ID: '+t.id);ids.add(t.id);});
    const fingerprint=fingerprint_(txs);
    const state=p.getProperty('migration_state');
    if(state&&state!==fingerprint)throw new Error('Dữ liệu nguồn đã thay đổi trong khi chuyển đổi. Dừng để đối chiếu bản sao lưu.');
    if(!state) {
      const backup=ss.copy(ss.getName()+' - Backup before yearly storage '+new Date().toISOString());
      p.setProperty('migration_backup_url',backup.getUrl());
      p.setProperty('migration_state',fingerprint);
    }
    const years=Array.from(new Set(txs.map(t=>Number(t.date.slice(0,4))))).sort();
    for(const year of years) {
      const source=txs.filter(t=>Number(t.date.slice(0,4))===year),sheet=ensureYear_(year);
      const existing=sheetToObjects(sheet).filter(t=>t.id);
      if(!existing.length&&source.length) {
        if(sheet.getMaxRows()<source.length+1)sheet.insertRowsAfter(sheet.getMaxRows(),source.length+1-sheet.getMaxRows());
        // Text date/timestamps preserve the exact original creation time.
        sheet.getRange(2,2,source.length,1).setNumberFormat('@');
        sheet.getRange(2,9,source.length,2).setNumberFormat('@');
        sheet.getRange(2,1,source.length,TX_COLUMNS.length).setValues(source.map(t=>TX_COLUMNS.map(k=>t[k]===undefined?'':t[k])));
      }
      SpreadsheetApp.flush();
      if(fingerprint_(sheetToObjects(sheet).filter(t=>t.id))!==fingerprint_(source))throw new Error('Đối chiếu không khớp năm '+year+'. Nguồn gốc được giữ nguyên.');
      writeSummaryYear_(year,source);
    }
    // Do not switch if unexpected yearly data exists.
    const copied=yearSheets_().flatMap(readNamed_);
    if(fingerprint_(copied)!==fingerprint)throw new Error('Đối chiếu toàn bộ dữ liệu không khớp');
    p.setProperty('dirty_years','[]');
    p.setProperty('storage_version','2');
    p.setProperty('data_revision',Utilities.getUuid());
    p.deleteProperty('migration_state');
    Logger.log('Chuyển đổi thành công: '+txs.length+' giao dịch; '+years.length+' năm. Backup: '+p.getProperty('migration_backup_url'));
  } finally {lock.releaseLock();}
}
function fingerprint_(txs) {
  const text=JSON.stringify(txs.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(t=>TX_COLUMNS.map(k=>k==='amount'?Number(t[k]):k==='deleted'?!activeTx_(t):String(t[k]||''))));
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text));
}
// Simple bound-sheet trigger: uses existing Sheets permission, no extra Drive/trigger scopes.
function onEdit(e) { summarySheetEdited(e); }
function summarySheetEdited(e) {
  if(!e||!e.range)return;
  const name=e.range.getSheet().getName();
  if(!/^Transactions_\d{4}$/.test(name))return;
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {
    recoverWrite_();
    markDirty_([Number(name.slice(-4))]);
    const first=Math.max(2,e.range.getRow()),last=e.range.getLastRow();
    const rows=sheetToObjects(e.range.getSheet());
    for(let row=first;row<=last;row++) {
      const tx=rows[row-2];
      if(!tx||!tx.id||!activeTx_(tx))continue;
      validateTx_(tx);
      if(Number(tx.date.slice(0,4))!==Number(name.slice(-4))) {
        const op={tx:{...tx,updated_at:new Date().toISOString()},old:{sheet:name,tx},years:[Number(name.slice(-4)),Number(tx.date.slice(0,4))]};
        const encoded=JSON.stringify(op);
        if(Utilities.newBlob(encoded).getBytes().length>8500)throw new Error('Giao dịch quá dài để chuyển năm tự động');
        storageProps_().setProperty('pending_transaction',encoded);
        recoverWrite_();
      }
    }
  } finally {lock.releaseLock();}
}
function summaryStructureChanged(e) {
  if(e&&e.changeType==='EDIT')return;
  const lock=LockService.getScriptLock();lock.waitLock(30000);
  try {markDirty_(yearSheets_().map(n=>Number(n.slice(-4))).concat(readNamed_('MonthlySummary').map(r=>Number(r.year))));} finally {lock.releaseLock();}
}
