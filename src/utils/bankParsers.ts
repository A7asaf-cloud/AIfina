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
      d.getUTCFullYear() + '-' +
      String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
      String(d.getUTCDate()).padStart(2, '0')
    );
  }
  if (val instanceof Date) {
    return (
      val.getFullYear() + '-' +
      String(val.getMonth() + 1).padStart(2, '0') + '-' +
      String(val.getDate()).padStart(2, '0')
    );
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  const m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m2) return m2[1] + '-' + m2[2].padStart(2, '0') + '-' + m2[3].padStart(2, '0');
  return '';
}

function looksLikeDate(val: any): boolean {
  if (val instanceof Date) return true;
  if (typeof val === 'number' && val > 30000 && val < 60000) return true;
  const s = String(val || '').trim();
  return (
    /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(s) ||
    /^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(s) ||
    /^\d{4}-\d{2}-\d{2}$/.test(s)
  );
}

function looksLikeAmount(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') return true;
  const s = String(val).trim().replace(/[,\s₪$€]/g, '');
  return /^-?\d+(\.\d{1,2})?$/.test(s) && s.length > 0;
}

// Among data rows, find the column with most non-numeric, non-date text
function inferDescriptionColumn(rows: any[][], excludeIdxs: number[]): number {
  const colScores: Record<number, number> = {};
  const colDateCount: Record<number, number> = {};

  for (const row of rows.slice(0, 30)) {
    if (!row) continue;
    row.forEach((cell, i) => {
      if (excludeIdxs.includes(i)) return;
      const s = String(cell ?? '').trim();
      if (!s || s.length <= 1) return;
      if (looksLikeDate(cell)) { colDateCount[i] = (colDateCount[i] || 0) + 1; return; }
      if (looksLikeAmount(cell)) return;
      // Text content score (longer = better)
      colScores[i] = (colScores[i] || 0) + s.length;
    });
  }

  // Exclude columns that are mostly dates
  for (const i of Object.keys(colDateCount).map(Number)) {
    delete colScores[i];
  }

  const best = Object.entries(colScores).sort((a, b) => b[1] - a[1])[0];
  return best ? parseInt(best[0]) : -1;
}

function parseAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).trim().replace(/[,\s₪$€]/g, '')) || 0;
}

export function parseBankRows(rows: any[][]): ParsedRow[] {
  if (!rows || !rows.length) return [];

  console.debug('[bankParser] total rows:', rows.length);
  console.debug('[bankParser] first 5 rows raw:', JSON.stringify(rows.slice(0, 5)));

  // ── Find header row (up to row 20) ──────────────────────────────────────
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = (rows[i] || []).map((c) => String(c || '').replace(/\n/g, ' ').toLowerCase());
    if (r.some((c) =>
      c.includes('תאריך') || c.includes('שם בית') || c.includes('שם עסק') ||
      c.includes('פירוט') || c.includes('תיאור') || c.includes('מוטב') ||
      c.includes('date') || c.includes('description') ||
      c.includes('חובה') || c.includes('זכות') || c.includes('amount')
    )) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) headerRow = 0;

  const headers = (rows[headerRow] || []).map((c) =>
    String(c || '').replace(/\n/g, ' ').toLowerCase().trim()
  );
  console.debug('[bankParser] headerRow:', headerRow, '| headers:', headers);

  // ── ALL date columns (there can be more than one: תאריך עסקה + תאריך חיוב) ──
  const allDateIdxs = headers.reduce<number[]>((acc, h, i) => {
    if (h.includes('תאריך') || h === 'date') acc.push(i);
    return acc;
  }, []);
  const dateIdx = allDateIdxs[0] ?? -1;

  // ── Amount columns ───────────────────────────────────────────────────────
  const debitIdx  = headers.findIndex((h) => h.includes('חובה') || h.includes('debit') || h.includes('חיוב'));
  const creditIdx = headers.findIndex((h) => h.includes('זכות') || h.includes('credit') || h.includes('זיכוי'));
  // Prefer "סכום חיוב" / "סכום לחיוב" over "סכום עסקה" (Max/Cal format)
  let amtIdx = headers.findIndex((h) => h.includes('סכום חיוב') || h.includes('סכום לחיוב'));
  if (amtIdx < 0) {
    amtIdx = headers.findIndex((h) =>
      (h.includes('סכום') || h.includes('amount')) && !h.includes('מט') && !h.includes('מקורי')
    );
  }

  // ── Description column — exclude ALL date columns + amount columns ───────
  const nonDescIdxs = [...new Set([...allDateIdxs, amtIdx, debitIdx, creditIdx].filter(i => i >= 0))];
  let descIdx = -1;
  const descPatterns = [
    'שם בית עסק', 'שם בית', 'שם עסק', 'פירוט', 'תיאור פעולה',
    'תיאור', 'מוטב', 'פרטים', 'שם הפעולה', 'ביאור', 'description', 'details', 'narrative',
  ];
  for (const pat of descPatterns) {
    const idx = headers.findIndex((h) => h.includes(pat));
    if (idx >= 0 && !nonDescIdxs.includes(idx)) { descIdx = idx; break; }
  }

  // Fallback: infer from data content (exclude date & amount columns)
  if (descIdx < 0) {
    descIdx = inferDescriptionColumn(rows.slice(headerRow + 1), nonDescIdxs);
    console.debug('[bankParser] inferred descIdx from data content:', descIdx);
  }

  // Last resort
  if (descIdx < 0) {
    // Pick the first column that is not a date/amount column
    for (let i = 0; i < headers.length; i++) {
      if (!nonDescIdxs.includes(i)) { descIdx = i; break; }
    }
    console.warn('[bankParser] last-resort descIdx:', descIdx);
  }

  console.debug('[bankParser] dateIdx:', dateIdx, '| descIdx:', descIdx,
    '| amtIdx:', amtIdx, '| debitIdx:', debitIdx, '| creditIdx:', creditIdx,
    '| allDateIdxs:', allDateIdxs);

  // ── Parse data rows ──────────────────────────────────────────────────────
  const result: ParsedRow[] = [];
  let skippedDate = 0, skippedDesc = 0, skippedAmount = 0;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : row[0];
    const dateStr = parseExcelDate(rawDate);
    if (!dateStr) { skippedDate++; continue; }

    const desc = String(row[descIdx] ?? '').trim();
    if (!desc || desc.includes('סה"כ') || desc.includes('סהכ') || desc.includes('יתרה')) {
      skippedDesc++; continue;
    }
    // Skip if it's a date or pure number (wrong column)
    if (looksLikeDate(desc)) { skippedDesc++; continue; }
    if (looksLikeAmount(desc) && desc.length < 6) { skippedDesc++; continue; }

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (debitIdx >= 0 && creditIdx >= 0) {
      const deb = Math.abs(parseAmount(row[debitIdx]));
      const cre = Math.abs(parseAmount(row[creditIdx]));
      if (cre > 0)      { amount = cre; type = 'income'; }
      else if (deb > 0) { amount = deb; type = 'expense'; }
    } else if (amtIdx >= 0) {
      const num = parseAmount(row[amtIdx]);
      amount = Math.abs(num);
      type = num < 0 ? 'income' : 'expense';
    } else {
      // Scan all numeric columns in the row
      for (let ci = 0; ci < row.length; ci++) {
        if (allDateIdxs.includes(ci) || ci === descIdx) continue;
        const n = parseAmount(row[ci]);
        if (Math.abs(n) > 0) { amount = Math.abs(n); type = n < 0 ? 'income' : 'expense'; break; }
      }
    }

    if (amount <= 0) { skippedAmount++; continue; }

    result.push({ date: dateStr, desc, amount, type });
  }

  console.debug(
    `[bankParser] parsed ${result.length} rows | skipped: date=${skippedDate} desc=${skippedDesc} amount=${skippedAmount}`
  );
  if (result.length > 0) console.debug('[bankParser] sample:', JSON.stringify(result.slice(0, 3)));

  return result;
}

export async function parseExcelOrCsvFile(file: File): Promise<Transaction[]> {
  const name = file.name.toLowerCase();
  const isCSV = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain';

  let rawData: any[][];

  if (isCSV) {
    let text = await file.text();
    // Windows-1255 fallback for Hebrew CSVs
    if (text.includes('�')) {
      const buf = await file.arrayBuffer();
      text = new TextDecoder('windows-1255').decode(buf);
    }
    const workbook = XLSX.read(text, { type: 'string', raw: false });
    const sheetName = workbook.SheetNames[0];
    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1, defval: '', raw: false,
    });
  } else {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array', raw: true, cellDates: true });
    const sheetName = workbook.SheetNames[0];
    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1, defval: '', raw: true,
    });
  }

  const parsed = parseBankRows(rawData);
  return parsed.map((r, i) => {
    const catInfo = categorize(r.desc);
    return {
      id: Date.now() + i + Math.random(),
      description: r.desc,
      amount: r.type === 'income'
        ? Math.round(r.amount * 100) / 100
        : -Math.round(r.amount * 100) / 100,
      date: r.date,
      cat: catInfo.cat,
      color: catInfo.color,
      emoji: catInfo.emoji,
      account: 'ייבוא',
    };
  });
}
