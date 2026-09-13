import { describe, expect, it } from 'vitest';
import { parseLocalStatement } from '../utils/localStatementParser';
describe('local statement parser', () => {
  it('imports a dated expense without a network service', () => {
    const result = parseLocalStatement('תאריך,תיאור,סכום\n12/09/2026,רמי לוי,-125.50');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ date: '2026-09-12', amount: -125.5, cat: 'מזון ושוק' });
  });
  it('skips headings and rows missing an amount', () => expect(parseLocalStatement('תאריך,תיאור,סכום\n12/09/2026,ללא סכום')).toEqual([]));
});
