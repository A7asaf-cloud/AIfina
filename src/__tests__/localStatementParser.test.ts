import { describe, expect, it } from 'vitest';
import { parseLocalStatement } from '../utils/localStatementParser';
describe('local statement parser', () => {
  it('imports only rows under explicit transaction headers', () => {
    const result = parseLocalStatement('תאריך עסקה,שם בית עסק,סכום\n12/09/2026,רמי לוי,-125.50');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ date: '2026-09-12', amount: -125.5, cat: 'מזון ושוק' });
  });
  it('uses debit and credit columns rather than guessing from a row', () => {
    const result = parseLocalStatement('תאריך\tפרטי פעולה\tחובה\tזכות\n12.09.2026\tמשכורת\t\t10000\n13.09.2026\tפז\t250\t');
    expect(result.map(t => t.amount)).toEqual([10000, -250]);
  });
  it('rejects files without supported headers rather than inventing transactions', () => {
    expect(parseLocalStatement('12/09/2026,רמי לוי,-125.50\n13/09/2026,יתרה,9000')).toEqual([]);
  });
  it('skips headings and rows missing an amount', () => expect(parseLocalStatement('תאריך,תיאור,סכום\n12/09/2026,ללא סכום')).toEqual([]));
});
