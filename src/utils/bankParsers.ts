/**
 * FinanceIL - Israeli Bank Statement Parser (Excel / CSV)
 * Supports: Max, Cal, Hapoalim, Leumi, Discount, Mizrahi, Visa Cal
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

// ── Date parsing ─────────────────────────────────────────────────────────────

function parseExcelDate(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  // Excel serial number
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return fmtDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  // JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return fmtDate(val.getFullYear(), val.getMonth() + 1, val.getDate());
  }

  const s = String(val).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m1) return fmtDate(+m1[3], +m1[2], +m1[1]);

  // DD/MM/YY (Max, Cal) — assume 2000s
  const m2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);
  if (m2) return fmtDate(2000 + +m2[3], +m2[2], +m2[1]);

  // YYYY/MM/DD
  const m3 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m3) return fmtDate(+m3[1], +m3[2], +m3[3]);

  return '';
}

function fmtDate(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function looksLikeDate(val: any): boolean {
  if (val instanceof Date) return true;
  if (typeof val === 'number' && val > 30000 && val < 60000) return true;
  const s = String(val ?? '').trim();
  return (
    /^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(s) ||
    /^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(s) ||
    /^\d{4}-\d{2}-\d{2}$/.test(s)
  );
}

function parseAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[,\s₪$€‏‎]/g, '')) || 0;
}

function looksLikeAmount(val: any): boolean {
  if (typeof val === 'number') return true;
  const s = String(val ?? '').trim().replace(/[,\s₪$€‏‎]/g, '');
  return /^-?\d+(\.\d{1,2})?$/.test(s);
}

// ── Column inference from data content ───────────────────────────────────────

function inferDescriptionColumn(dataRows: any[][], excludeIdxs: number[]): number {
  const textScore: Record<number, number> = {};
  const dateCounts: Record<number, number> = {};

  for (const row of dataRows.slice(0, 30)) {
    if (!row) continue;
    row.forEach((cell, i) => {
      if (excludeIdxs.includes(i)) return;
      const s = String(cell ?? '').trim();
      if (!s || s.length <= 1) return;
      if (looksLikeDate(cell)) { dateCounts[i] = (dateCounts[i] || 0) + 1; return; }
      if (looksLikeAmount(cell)) return;
      textScore[i] = (textScore[i] || 0) + s.length;
    });
  }

  // Remove columns that are mostly dates
  for (const i of Object.keys(dateCounts).map(Number)) delete textScore[i];

  const best = Object.entries(textScore).sort((a, b) => +b[1] - +a[1])[0];
  return best ? +best[0] : -1;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseBankRows(rows: any[][]): ParsedRow[] {
  if (!rows?.length) return [];

  console.debug('[bankParser] total rows:', rows.length);
  console.debug('[bankParser] first 5 rows raw:', JSON.stringify(rows.slice(0, 5)));

  // ── Find header row (scan up to row 25) ─────────────────────────────────
  let headerRow = -1;
  const headerKeywords = [
    'תאריך','שם בית','שם עסק','פירוט','תיאור','מוטב','פרטים',
    'ביצוע','date','description','חובה','זכות','amount','סכום',
  ];
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const r = (rows[i] || []).map((c) => String(c ?? '').toLowerCase());
    if (r.some((c) => headerKeywords.some((kw) => c.includes(kw)))) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) headerRow = 0;

  const rawHeaders = rows[headerRow] || [];
  const headers = rawHeaders.map((c) =>
    String(c ?? '').replace(/\n/g, ' ').toLowerCase().trim()
  );

  console.debug('[bankParser] headerRow:', headerRow, '| headers:', headers);

  // ── Detect ALL date columns ──────────────────────────────────────────────
  const allDateIdxs: number[] = [];
  headers.forEach((h, i) => {
    if (h.includes('תאריך') || h === 'date' || h.includes('ביצוע') || h.includes('ערך')) {
      allDateIdxs.push(i);
    }
  });
  const dateIdx = allDateIdxs[0] ?? -1;

  // ── Detect amount columns ────────────────────────────────────────────────
  const debitIdx  = headers.findIndex((h) =>
    // Must be a standalone debit column, NOT a date column (תאריך חיוב)
    (h.includes('חובה') || h.includes('debit')) && !h.includes('תאריך')
  );
  const creditIdx = headers.findIndex((h) =>
    (h.includes('זכות') || h.includes('credit') || h.includes('זיכוי')) && !h.includes('תאריך')
  );
  // Prefer "סכום חיוב"/"סכום לחיוב" over "סכום עסקה" (Max/Cal)
  let amtIdx = headers.findIndex((h) =>
    h.includes('סכום חיוב') || h.includes('סכום לחיוב')
  );
  if (amtIdx < 0) {
    amtIdx = headers.findIndex((h) =>
      (h.includes('סכום') || h.includes('amount')) &&
      !h.includes('מט') && !h.includes('מקורי')
    );
  }
  // If the amount column header implies "always a charge" (credit card), mark all as expense
  const amtAlwaysExpense = amtIdx >= 0 &&
    (headers[amtIdx]?.includes('חיוב') || headers[amtIdx]?.includes('debit'));

  // ── Detect description column ────────────────────────────────────────────
  const nonDescIdxs = [...new Set([...allDateIdxs, amtIdx, debitIdx, creditIdx].filter(i => i >= 0))];

  // Ordered patterns — most specific first
  const descPatterns = [
    'שם בית עסק', 'שם בית', 'שם עסק',
    'שם/תיאור',            // Bank Hapoalim: "שם/תיאור פעולה"
    'תיאור פעולה', 'תיאור',
    'פירוט', 'פרטים', 'מוטב', 'שם הפעולה', 'ביאור',
    'description', 'details', 'narrative', 'payee',
  ];
  let descIdx = -1;
  for (const pat of descPatterns) {
    const idx = headers.findIndex((h) => h.includes(pat));
    if (idx >= 0 && !nonDescIdxs.includes(idx)) { descIdx = idx; break; }
  }

  // Smart fallback — find column with most text that isn't dates/amounts
  if (descIdx < 0) {
    descIdx = inferDescriptionColumn(rows.slice(headerRow + 1), nonDescIdxs);
    console.debug('[bankParser] inferred descIdx from content:', descIdx);
  }

  // Last resort — first non-date/amount column
  if (descIdx < 0) {
    for (let i = 0; i < headers.length; i++) {
      if (!nonDescIdxs.includes(i)) { descIdx = i; break; }
    }
    console.warn('[bankParser] last-resort descIdx:', descIdx);
  }

  console.debug(
    '[bankParser] dateIdx:', dateIdx, '| descIdx:', descIdx,
    '| amtIdx:', amtIdx, '| debitIdx:', debitIdx, '| creditIdx:', creditIdx,
    '| allDateIdxs:', allDateIdxs
  );

  // ── Parse data rows ──────────────────────────────────────────────────────
  const result: ParsedRow[] = [];
  let skDate = 0, skDesc = 0, skAmt = 0;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === '')) continue;

    // Date
    const rawDate = dateIdx >= 0 ? row[dateIdx] : row[0];
    const dateStr = parseExcelDate(rawDate);
    if (!dateStr) { skDate++; continue; }

    // Description
    const rawDesc = descIdx >= 0 ? row[descIdx] : row[1];
    const desc = String(rawDesc ?? '').trim();

    if (!desc) { skDesc++; continue; }
    if (desc.includes('סה"כ') || desc.includes('סהכ') || desc.toLowerCase().includes('total')) { skDesc++; continue; }
    if (looksLikeDate(rawDesc)) { skDesc++; continue; }
    // Skip if it's a short number (reference ID)
    if (looksLikeAmount(rawDesc) && desc.replace(/[,.\s]/g, '').length <= 10) { skDesc++; continue; }

    // Amount
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
      // negative = expense (debit), positive = income — unless column header says it's always a charge
      type = amtAlwaysExpense ? 'expense' : (num < 0 ? 'expense' : 'income');
    } else {
      // Scan all columns for the first numeric value
      for (let ci = 0; ci < row.length; ci++) {
        if ([...allDateIdxs, descIdx].includes(ci)) continue;
        const n = parseAmount(row[ci]);
        if (Math.abs(n) > 0) { amount = Math.abs(n); type = n < 0 ? 'income' : 'expense'; break; }
      }
    }

    if (amount <= 0) { skAmt++; continue; }

    result.push({ date: dateStr, desc, amount, type });
  }

  console.debug(
    `[bankParser] parsed ${result.length} rows | skipped date=${skDate} desc=${skDesc} amount=${skAmt}`
  );
  if (result.length > 0) console.debug('[bankParser] sample:', JSON.stringify(result.slice(0, 3)));
  else console.error('[bankParser] ❌ 0 rows parsed! Check headers and column indices above.');

  return result;
}

// ── File reader ───────────────────────────────────────────────────────────────

export async function parseExcelOrCsvFile(file: File): Promise<Transaction[]> {
  const name = file.name.toLowerCase();
  const isCSV = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain';

  let rawData: any[][];

  if (isCSV) {
    let text = await file.text();
    // Fallback to Windows-1255 if Hebrew looks garbled
    if (text.includes('�') || (text.length > 0 && !/[א-ת]/.test(text.slice(0, 500)))) {
      try {
        const buf = await file.arrayBuffer();
        const decoded = new TextDecoder('windows-1255').decode(buf);
        if (/[א-ת]/.test(decoded)) text = decoded;
      } catch { /* keep original */ }
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
