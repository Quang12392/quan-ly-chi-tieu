/**
 * UTILS & HELPER FUNCTIONS
 */

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

/**
 * Maps spreadsheet rows to array of JS objects based on header row names.
 * Avoids hardcoded magic numbers!
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const rows = data.slice(1);

  return rows.map(row => {
    const item = {};
    headers.forEach((header, colIndex) => {
      let val = row[colIndex];
      // Convert dates to YYYY-MM-DD string if needed
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Bangkok', 'yyyy-MM-dd');
      }
      item[header] = val;
    });
    return item;
  });
}

/**
 * Gets header map for a sheet: { headerName: 1-indexed columnIndex }
 */
function getHeaderIndexMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, idx) => {
    map[String(h).trim().toLowerCase()] = idx + 1;
  });
  return map;
}
