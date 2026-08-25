/**
 * FinanceIL - Formatting & Date Utilities
 */

export const fmtILS = (n: number | undefined | null): string => {
  if (typeof n !== 'number' || isNaN(n)) return '₪0';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
};

export const fmtUSD = (n: number | undefined | null): string => {
  if (typeof n !== 'number' || isNaN(n)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
};

export const fmtDate = (s: string): string => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'short',
  }).format(d);
};

export const fmtFullDate = (s: string): string => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

export const daysUntil = (targetDay: number): number => {
  if (!targetDay || targetDay < 1 || targetDay > 31) return 0;
  const now = new Date();
  const today = now.getDate();
  if (targetDay > today) return targetDay - today;
  
  // Target day has passed this month -> count to next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
  return Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const getMonthKey = (date?: Date): string => {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const fmtPercent = (n: number | undefined | null, decimals = 0): string => {
  if (typeof n !== 'number' || isNaN(n)) return '0%';
  return `${n.toFixed(decimals)}%`;
};

export const todayLabelHe = (): string =>
  new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

const HE_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
export const monthLabelHe = (year: number, m0: number): string => `${HE_MONTHS[m0] ?? ''} ${year}`;

export const dayLabelHe = (s: string): string => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'היום';
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'אתמול';
  return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'long' }).format(d);
};
