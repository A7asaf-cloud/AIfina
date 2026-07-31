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
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  // YYYY/MM/DD
  const m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (m2) return m2[1] + '-' + m2[2].padStart(2, '0') + '-' + m2[3].padStart(2, '0');
  return '';
}

function isNumericCell(val: any): boolean {
  if (val === null || val === undefined || val === '') return true;
  const s = String(val).trim().replace(/[,.\s\-]/g, '');
  return /^\d+$/.test(s);
}

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

function parseAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim().replace(/[,\s]/g, '');
  return parseFloat(s) || 0;
}

export function parseBankRows(rows: any[][]): ParsedRow[] {
  if (!rows || !rows.length) return [];

  console.debug('[bankParser] total rows:', rows.length);
  console.debug('[bankParser] first 5 rows raw:', JSON.stringify(rows.slice(0, 5)));

  // ── Find the header row (scan up to row 20) ──────────────────────────────
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const r = (rows[i] || []).map((c) =>
      String(c || '').replace(/\n/g, ' ').toLowerCase()
    );
    if (
      r.some((c) =>
        c.includes('תאריך') ||
        c.includes('שם בית') ||
        c.includes('שם עסק') ||
        c.includes('פירוט') ||
        c.includes('תיאור') ||
        c.includes('מוטב') ||
        c.includes('פרטים') ||
        c.includes('ביצוע') ||
        c.includes('date') ||
        c.includes('description') ||
        c.includes('סכום') ||
        c.includes('חובה') ||
        c.includes('זכות') ||
        c.includes('amount')
      )
    ) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) {
    console.warn('[bankParser] header row not found, defaulting to row 0');
    headerRow = 0;
  }
  console.debug('[bankParser] headerRow index:', headerRow);

  const headers = (rows[headerRow] || []).map((c) =>
    String(c || '').replace(/\n/g, ' ').toLowerCase().trim()
  );
  console.debug('[bankParser] headers:', headers);

  // ── Detect date column ───────────────────────────────────────────────────
  let dateIdx = headers.findIndex((h) =>
    h.includes('תאריך') || h === 'date'
  );
  // Prefer the first date column (not "תאריך ערך" or "תאריך חיוב")
  if (dateIdx < 0) {
    dateIdx = headers.findIndex((h) => h.includes('date'));
  }

  // ── Detect description column ────────────────────────────────────────────
  let descIdx = -1;
  const descPatterns = [
    'שם בית עסק', 'שם בית', 'שם עסק', 'פירוט', 'תיאור פעולה',
    'תיאור', 'מוטב', 'פרטים', 'שם הפעולה', 'ביאור', 'description', 'details', 'narrative',
  ];
  for (const pat of descPatterns) {
    const idx = headers.findIndex((h) => h.includes(pat));
    if (idx >= 0 && idx !== dateIdx) { descIdx = idx; break; }
  }

  // ── Detect amount columns ────────────────────────────────────────────────
  const debitIdx = headers.findIndex((h) =>
    h.includes('חובה') || h.includes('debit') || h.includes('חיוב')
  );
  const creditIdx = headers.findIndex((h) =>
    h.includes('זכות') || h.includes('credit') || h.includes('זיכוי')
  );
  // prefer סכום חיוב over סכום עסקה (Max/Cal)
  let amtIdx = headers.findIndex((h) =>
    h.includes('סכום חיוב') || h.includes('סכום לחיוב')
  );
  if (amtIdx < 0) {
    amtIdx = headers.findIndex((h) =>
      (h.includes('סכום') || h.includes('amount')) &&
      !h.includes('מט') && !h.includes('מקורי')
    );
  }

  // ── Smart fallback for description ──────────────────────────────────────
  if (descIdx < 0) {
    const dataRows = rows.slice(headerRow + 1);
    const exclude = [dateIdx, amtIdx, debitIdx, creditIdx].filter((i) => i >= 0);
    descIdx = inferDescriptionColumn(dataRows, exclude);
    console.debug('[bankParser] inferred descIdx from content:', descIdx);
  }
  if (descIdx < 0) {
    descIdx = dateIdx >= 0 ? (dateIdx === 0 ? 1 : 0) : 1;
    console.warn('[bankParser] last-resort descIdx:', descIdx);
  }

  console.debug('[bankParser] dateIdx:', dateIdx, '| descIdx:', descIdx,
    '| amtIdx:', amtIdx, '| debitIdx:', debitIdx, '| creditIdx:', creditIdx);

  // ── Parse data rows ──────────────────────────────────────────────────────
  const result: ParsedRow[] = [];
  let skippedDate = 0, skippedDesc = 0, skippedAmount = 0;

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || c === ''))
      continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : row[0];
    const dateStr = parseExcelDate(rawDate);
    if (!dateStr) { skippedDate++; continue; }

    const desc = String(
      descIdx >= 0 ? (row[descIdx] ?? '') : (row[1] ?? '')
    ).trim();

    if (!desc || desc.includes('סה"כ') || desc.includes('סהכ') || desc.includes('יתרה')) {
      skippedDesc++; continue;
    }
    if (isNumericCell(desc)) { skippedDesc++; continue; }

    let amount = 0;
    let type: 'income' | 'expense' = 'expense';

    if (debitIdx >= 0 && creditIdx >= 0) {
      const deb = Math.abs(parseAmount(row[debitIdx]));
      const cre = Math.abs(parseAmount(row[creditIdx]));
      if (cre > 0) { amount = cre; type = 'income'; }
      else if (deb > 0) { amount = deb; type = 'expense'; }
    } else if (amtIdx >= 0) {
      const num = parseAmount(row[amtIdx]);
      amount = Math.abs(num);
      type = num < 0 ? 'income' : 'expense';
    } else {
      // No amount column detected — scan all numeric columns in this row
      for (let ci = 0; ci < row.length; ci++) {
        if (ci === dateIdx || ci === descIdx) continue;
        const n = parseAmount(row[ci]);
        if (Math.abs(n) > 0) { amount = Math.abs(n); type = n < 0 ? 'income' : 'expense'; break; }
      }
    }

    if (amount <= 0) { skippedAmount++; continue; }

    result.push({ date: dateStr, desc, amount, type });
  }

  console.debug(
    `[bankParser] parsed ${result.length} rows. Skipped: date=${skippedDate}, desc=${skippedDesc}, amount=${skippedAmount}`
  );
  console.debug('[bankParser] first 3 results:', JSON.stringify(result.slice(0, 3)));

  return result;
}

export async function parseExcelOrCsvFile(file: File): Promise<Transaction[]> {
  const name = file.name.toLowerCase();
  const isCSV = name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'text/plain';

  let rawData: any[][];

  if (isCSV) {
    // Try UTF-8 first; fallback to latin1 which preserves byte values for Windows-1255
    let text = '';
    try {
      text = await file.text();
      // If Hebrew chars look garbled (replacement chars), retry with latin1
      if (text.includes('�')) {
        const buf = await file.arrayBuffer();
        text = new TextDecoder('windows-1255').decode(buf);
      }
    } catch {
      text = await file.text();
    }
    const workbook = XLSX.read(text, { type: 'string', raw: false });
    const sheetName = workbook.SheetNames[0];
    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
    });
  } else {
    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: 'array', raw: true, cellDates: true });
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
      amount:
        r.type === 'income'
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
