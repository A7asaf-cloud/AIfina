/**
 * FinanceIL - Israeli Bank Statement Parser (Excel / CSV)
 */
import * as XLSX from 'xlsx';
import { Transaction } from '../types';
import { categorize } from './categories';

interface ParsedRow {
  date: string;
  desc: string;
  amount: number;
  type: 'income' | 'expense';
}

function parseExcelDate(val: any): string {
  if (!val && val !== 0) return '';
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return (
      d.getUTCFullYear() +
      '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getUTCDate()).padStart(2, '0')
    );
  }
  if (val instanceof Date) {
    return (
      val.getFullYear() +
      '-' +
      String(val.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(val.getDate()).padStart(2, '0')
    );
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) {
    return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }
  return '';
}

// Returns true if a column value looks like a pure number / reference code
function isNumericCell(val: any): boolean {
  if (val === null || val === undefined || val === '') return true;
  const s = String(val).trim().replace(/[,.\s]/g, '');
  return /^\d+$/.test(s);
}

// Given data rows, pick the column index that has the most non-numeric text content
// (used as a fallback when header names don't match)
function inferDescriptionColumn(rows: any[][], excludeIdxs: number[]): number {
  const scores: Record<number, number> = {};
  for (const row of rows.slice(0, 20)) {
    if (!row) continue;
    row.forEach((cell, i) => {
      if (excludeIdxs.includes(i)) return;
      const s = String(cell || '').trim();
      if (s && !isNumericCell(cell) && s.length > 1) {
        scores[i] = (scores[i] || 0) + s.length;
      }
    });
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best ? parseInt(best[0]) : -1;
}

export function parseBankRows(rows: any[][]): ParsedRow[] {
  if (!rows || !rows.length) return [];

  // ── Find the header row ──────────────────────────────────────────────────
  let headerRow = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = (rows[i] || []).map((c) =>
      String(c || '').replace(/\n/g, ' ').toLowerCase()
    );
    if (
      r.some(
        (c) =>
          c.includes('תאריך') ||
          c.includes('שם בית') ||
          c.includes('שם עסק') ||
          c.includes('פירוט') ||
          c.includes('תיאור') ||
          c.includes('מוטב') ||
          c.includes('פרטים') ||
          c.includes('date') ||
          c.includes('description')
      )
    ) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) headerRow = 0;

  const headers = (rows[headerRow] || []).map((c) =>
    String(c || '').replace(/\n/g, ' ').toLowerCase().trim()
  );

  console.debug('[bankParser] headers:', headers);

  // ── Detect date column ───────────────────────────────────────────────────
  const dateIdx = headers.findIndex(
    (h) => h.includes('תאריך') || h === 'date'
  );

  // ── Detect description column ────────────────────────────────────────────
  let descIdx = -1;
  const descPatterns = [
    'שם בית עסק', 'שם בית', 'שם עסק', 'פירוט', 'תיאור פעולה',
    'תיאור', 'מוטב', 'פרטים', 'שם הפעולה', 'description', 'details',
  ];
  for (const pat of descPatterns) {
    descIdx = headers.findIndex((h) => h.includes(pat));
    if (descIdx >= 0 && descIdx !== dateIdx) break;
  }

  // ── Detect amount columns ────────────────────────────────────────────────
  const amtIdx = headers.findIndex(
    (h) => (h.includes('סכום') || h.includes('amount')) && !h.includes('מט') && !h.includes('מקורי')
  );
  const debitIdx = headers.findIndex(
    (h) => h.includes('חובה') || h.includes('debit') || h.includes('חיוב')
  );
  const creditIdx = headers.findIndex(
    (h) => h.includes('זכות') || h.includes('credit') || h.includes('זיכוי')
  );

  // ── Smart fallback: infer description column from data content ───────────
  if (descIdx < 0 || descIdx === dateIdx) {
    const dataRows = rows.slice(headerRow + 1);
    const exclude = [dateIdx, amtIdx, debitIdx, creditIdx].filter(i => i >= 0);
    descIdx = inferDescriptionColumn(dataRows, exclude);
    console.debug('[bankParser] inferred descIdx from content:', descIdx);
  }

  // Last resort
  if (descIdx < 0) {
    descIdx = dateIdx >= 0 ? (dateIdx === 0 ? 1 : 0) : 1;
  }

  console.debug('[bankParser] dateIdx:', dateIdx, '| descIdx:', descIdx, '| amtIdx:', amtIdx, '| debitIdx:', debitIdx, '| creditIdx:', creditIdx);

  // ── Parse data rows ──────────────────────────────────────────────────────
  const result: ParsedRow[] = [];

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === ''))
      continue;

    const dateStr = parseExcelDate(dateIdx >= 0 ? row[dateIdx] : row[0]);
    if (!dateStr) continue;

    const desc = String(
      descIdx >= 0 ? row[descIdx] ?? '' : row[1] ?? ''
    ).trim();
    if (!desc || desc.includes('סה"כ') || desc.includes('סהכ')) continue;

    // Skip if description is just a number (picked wrong column)
    if (isNumericCell(desc)) continue;

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (debitIdx >= 0 && creditIdx >= 0) {
      const deb =
        parseFloat(String(row[debitIdx] || '0').replace(/[,\s]/g, '')) || 0;
      const cre =
        parseFloat(String(row[creditIdx] || '0').replace(/[,\s]/g, '')) || 0;
      if (cre > 0) {
        amount = cre;
        type = 'income';
      } else if (deb > 0) {
        amount = deb;
        type = 'expense';
      }
    } else {
      const rawAmt = amtIdx >= 0 ? row[amtIdx] : row[2];
      if (rawAmt === null || rawAmt === undefined || rawAmt === '') continue;
      const num = parseFloat(String(rawAmt).replace(/[,\s]/g, '')) || 0;
      amount = Math.abs(num);
      type = num < 0 ? 'income' : 'expense';
    }

    if (amount <= 0) continue;

    result.push({ date: dateStr, desc, amount, type });
  }

  console.debug('[bankParser] parsed', result.length, 'rows. First 3:', result.slice(0, 3));
  return result;
}

export async function parseExcelOrCsvFile(file: File): Promise<Transaction[]> {
  const name = file.name.toLowerCase();
  const isCSV = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain';

  let rawData: any[][];

  if (isCSV) {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: 'string', raw: false });
    const sheetName = workbook.SheetNames[0];
    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true,
    });
  } else {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array', raw: true });
    const sheetName = workbook.SheetNames[0];
    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true,
    });
  }

  const parsed = parseBankRows(rawData);
  return parsed.map((r, i) => {
    const catInfo = categorize(r.desc);
    return {
      id: Date.now() + i + Math.random(),
      description: r.desc,
      amount: r.type === 'income' ? Math.round(r.amount * 100) / 100 : -Math.round(r.amount * 100) / 100,
      date: r.date,
      cat: catInfo.cat,
      color: catInfo.color,
      emoji: catInfo.emoji,
      account: 'ייבוא',
    };
  });
}
