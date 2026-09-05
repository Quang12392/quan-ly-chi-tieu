/**
 * BUDGETS SERVICE
 */

function handleGetBudgets(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Budgets');
  if (!sheet) return successResponse([]);

  const list = sheetToObjects(sheet);
  const year = Number(payload.year);
  const month = Number(payload.month);

  if (!year || !month) {
    return successResponse(list);
  }

  let filtered = list.filter(b => Number(b.year) === year && Number(b.month) === month);

  // Tự động kế thừa hạn mức từ tháng gần nhất trước đó nếu tháng này chưa đặt
  if (filtered.length === 0 && list.length > 0) {
    const pastBudgets = list
      .filter(b => (Number(b.year) < year) || (Number(b.year) === year && Number(b.month) < month))
      .sort((a, b) => (Number(b.year) - Number(a.year)) || (Number(b.month) - Number(a.month)));

    if (pastBudgets.length > 0) {
      const latestY = Number(pastBudgets[0].year);
      const latestM = Number(pastBudgets[0].month);
      filtered = pastBudgets
        .filter(b => Number(b.year) === latestY && Number(b.month) === latestM)
        .map(b => ({
          ...b,
          id: 'b_' + year + '_' + month + '_' + b.category_id,
          year: year,
          month: month,
          inherited_from: latestM + '/' + latestY
        }));
    }
  }

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
