/**
 * Format currency to Vietnamese Dong (e.g., 250.000 ₫)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact VND rounded to the nearest thousand: 22,325,000 -> 22tr325. */
export function formatCompactCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '0đ';
  const thousands = Math.round(Math.abs(amount) / 1000);
  const sign = amount < 0 && thousands > 0 ? '-' : '';
  if (thousands === 0) return '0đ';
  if (thousands < 1000) return `${sign}${thousands}k`;
  const millions = Math.floor(thousands / 1000);
  const remainder = thousands % 1000;
  return `${sign}${millions}tr${remainder ? String(remainder).padStart(3, '0') : ''}`;
}

/**
 * Format raw number to display with thousand separators (e.g. 250000 -> 250.000)
 */
export function formatNumberWithDots(val: number | string): string {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
}

/**
 * Parse a user input string into clean integer
 */
export function parseCurrencyInput(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/\D/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Get current date formatted as YYYY-MM-DD in local timezone (Asia/Bangkok)
 * Avoids the UTC day-shift bug!
 */
export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format YYYY-MM-DD to DD/MM/YYYY
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/** Show the selected transaction date with its creation time in Vietnam (24-hour).
 * Older records without a valid timestamp keep their date-only display.
 */
export function formatTransactionDateTime(dateStr: string, createdAt?: string): string {
  const date = formatDate(dateStr);
  if (!createdAt) return date;
  const timestamp = new Date(createdAt);
  if (Number.isNaN(timestamp.getTime())) return date;
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(timestamp);
  return `${date} ${time}`;
}

/**
 * Get start and end dates of a month (1-indexed month)
 */
export function getMonthRange(year: number, month: number): { from: string; through: string } {
  const padMonth = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const padLastDay = String(lastDay).padStart(2, '0');
  return {
    from: `${year}-${padMonth}-01`,
    through: `${year}-${padMonth}-${padLastDay}`,
  };
}
