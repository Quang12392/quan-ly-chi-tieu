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
