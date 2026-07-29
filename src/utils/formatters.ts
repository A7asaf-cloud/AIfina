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
