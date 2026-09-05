/**
 * TRANSACTIONS SERVICE
 */

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

  // Sort descending by date, then created_at
  filtered.sort((a, b) => {
    return String(b.date).localeCompare(String(a.date)) || 
           String(b.created_at).localeCompare(String(a.created_at));
  });

  return successResponse(filtered);
}

function handleCreateTransaction(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 30 seconds wait for concurrency
  } catch (e) {
    return errorResponse('Hệ thống đang bận, vui lòng thử lại sau vài giây', 'LOCKED');
  }

  try {
    // Validation
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
        targetRow = i + 1; // 1-indexed
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
