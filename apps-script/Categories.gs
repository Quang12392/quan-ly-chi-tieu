/**
 * CATEGORIES SERVICE
 */

function handleGetCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Categories');
  if (!sheet) return successResponse([]);

  const list = sheetToObjects(sheet);
  // Sort by sort_order
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
