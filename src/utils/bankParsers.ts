/**
 * FinanceIL - File reader for bank statements.
 * Parsing is done by Gemini AI via /api/parse-statement.
 */
import * as XLSX from 'xlsx';

export async function readFileAsText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isCSV =
    name.endsWith('.csv') ||
    file.type === 'text/csv' ||
    file.type === 'text/plain';

  if (isCSV) {
    let text = await file.text();
    // If no Hebrew detected, try Windows-1255 (common in Israeli bank exports)
    if (!/[א-ת]/.test(text.slice(0, 500))) {
      try {
        const buf = await file.arrayBuffer();
        const decoded = new TextDecoder('windows-1255').decode(buf);
        if (/[א-ת]/.test(decoded)) text = decoded;
      } catch { /* keep original */ }
    }
    return text;
  }

  // Excel → convert to CSV text so Gemini can read it
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\n' });
}
