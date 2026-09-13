import { Transaction } from '../types';
import { categorize } from './categories';

const dateFrom = (value: string) => {
  const m = value.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})|(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (!m) return null;
  const year = Number(m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : m[4]);
  const month = Number(m[2] || m[5]); const day = Number(m[1] || m[6]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const amountFrom = (value: string) => {
  const matches = value.match(/-?\s*\d{1,3}(?:[,.]\d{3})*(?:[.,]\d{1,2})|-?\s*\d+(?:[.,]\d{1,2})?/g) || [];
  const candidate = matches.map(x => Number(x.replace(/\s/g, '').replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, ''))).filter(Number.isFinite).at(-1);
  return candidate == null ? null : candidate;
};
/** A conservative offline CSV reader. It only imports rows containing a date and amount. */
export function parseLocalStatement(content: string): Transaction[] {
  const rows = content.split(/\r?\n/).map(row => row.trim()).filter(Boolean);
  return rows.flatMap((row, index) => {
    const date = dateFrom(row);
    const cells = row.split(/[;,\t]/).map(v => v.trim()).filter(Boolean);
    const amount = cells.filter(cell => !dateFrom(cell)).map(amountFrom).filter((n): n is number => n != null).at(-1);
    if (!date || amount == null || amount === 0) return [];
    const description = cells.filter(cell => !dateFrom(cell) && amountFrom(cell) == null && /[א-תA-Za-z]/.test(cell)).sort((a,b) => b.length - a.length)[0];
    if (!description || /^(תאריך|date|יתרה|balance)/i.test(description)) return [];
    const income = amount > 0 && /זכות|הכנסה|משכורת|הפקדה|credit|income/i.test(row);
    const details = categorize(description);
    return [{ id: `${Date.now()}-${index}-${Math.random()}`, description, amount: income ? Math.abs(amount) : -Math.abs(amount), date, cat: details.cat, color: details.color, emoji: details.emoji, account: 'ייבוא מקומי', status: 'posted' }];
  });
}
