import { Transaction } from '../types';
import { categorize } from './categories';

type Columns = { date: number; description: number; amount?: number; debit?: number; credit?: number };
const normalize = (s: string) => s.replace(/["׳״]/g, '').trim().toLowerCase();
const splitRow = (row: string, delimiter: string) => {
  const result: string[] = []; let cell = ''; let quote = false;
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '"') { quote = !quote; continue; }
    if (row[i] === delimiter && !quote) { result.push(cell.trim()); cell = ''; } else cell += row[i];
  }
  result.push(cell.trim()); return result;
};
const delimiterFor = (row: string) => ['\t', ';', ','].map(d => ({ d, n: splitRow(row, d).length })).sort((a, b) => b.n - a.n)[0].d;
const headerIndex = (headers: string[], terms: string[]) => headers.findIndex(header => terms.some(term => header.includes(term)));
const parseDate = (s: string): string | null => {
  const match = s.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$|^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : match[4]);
  const month = Number(match[2] || match[5]); const day = Number(match[1] || match[6]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const parseAmount = (value?: string): number | null => {
  if (!value) return null;
  const raw = value.replace(/[₪$\s]/g, '').replace(/[()]/g, '').replace(/[^0-9,.-]/g, '');
  if (!raw || !/[0-9]/.test(raw)) return null;
  const comma = raw.lastIndexOf(','); const dot = raw.lastIndexOf('.');
  const normalized = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  const result = Number(normalized); return Number.isFinite(result) ? result : null;
};
const validDescription = (value?: string) => Boolean(value && /[א-תA-Za-z]/.test(value) && !/^(סיכום|סהכ|יתרה|balance|total)$/i.test(value.trim()));

/** Strict offline importer: headers and exact transaction columns are mandatory. */
export function parseLocalStatement(content: string): Transaction[] {
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const headerLine = lines.findIndex(line => /תאריך|date/i.test(line) && /תיאור|פרטי|פרטים|עסק|description|name/i.test(line) && /סכום|חובה|זכות|amount|debit|credit/i.test(line));
  if (headerLine < 0) return [];
  const delimiter = delimiterFor(lines[headerLine]);
  const headers = splitRow(lines[headerLine], delimiter).map(normalize);
  const columns: Columns = {
    date: headerIndex(headers, ['תאריך', 'date']),
    description: headerIndex(headers, ['תיאור', 'פרטי', 'פרטים', 'בית עסק', 'שם עסק', 'description', 'merchant', 'name']),
    amount: headerIndex(headers, ['סכום', 'amount']),
    debit: headerIndex(headers, ['חובה', 'debit']), credit: headerIndex(headers, ['זכות', 'credit']),
  };
  if (columns.date < 0 || columns.description < 0 || (columns.amount! < 0 && columns.debit! < 0 && columns.credit! < 0)) return [];
  return lines.slice(headerLine + 1).flatMap((line, index) => {
    const cells = splitRow(line, delimiter); const date = parseDate(cells[columns.date]); const description = cells[columns.description]?.trim();
    if (!date || !validDescription(description)) return [];
    const debit = columns.debit! >= 0 ? parseAmount(cells[columns.debit!]) : null;
    const credit = columns.credit! >= 0 ? parseAmount(cells[columns.credit!]) : null;
    const listed = columns.amount! >= 0 ? parseAmount(cells[columns.amount!]) : null;
    const signed = credit != null && credit !== 0 ? Math.abs(credit) : debit != null && debit !== 0 ? -Math.abs(debit) : listed;
    if (signed == null || signed === 0) return [];
    const details = categorize(description!);
    return [{ id: `${Date.now()}-${index}-${Math.random()}`, description: description!, amount: signed, date, cat: details.cat, color: details.color, emoji: details.emoji, account: 'ייבוא מקומי', status: 'posted' }];
  });
}
