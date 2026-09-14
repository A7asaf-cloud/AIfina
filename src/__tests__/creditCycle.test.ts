import { describe, expect, it } from 'vitest';
import { assignImportedCreditCycle, creditSettlementDate } from '../utils/creditCycle';
describe('credit card cycle assignment', () => {
  const cycle = { creditDay: 9, creditCycleDay: 9 };
  it('assigns purchases from the 9th through the 8th to the following 9th', () => {
    expect(creditSettlementDate('2026-09-08', cycle)).toBe('2026-09-09');
    expect(creditSettlementDate('2026-09-09', cycle)).toBe('2026-10-09');
    expect(creditSettlementDate('2026-10-08', cycle)).toBe('2026-10-09');
  });
  it('keeps incoming transactions out of the credit collection', () => {
    const result = assignImportedCreditCycle([{ id: 'a', date: '2026-09-12', description: 'קנייה', amount: -80, cat: 'קניות', emoji: '🛍️', color: '#000' }, { id: 'b', date: '2026-09-12', description: 'זיכוי', amount: 80, cat: 'שונות', emoji: '↩️', color: '#000' }], cycle);
    expect(result[0]).toMatchObject({ paymentMethod: 'credit', cashflowDate: '2026-10-09', settlementId: 'credit-2026-10-09' });
    expect(result[1].cashflowDate).toBeUndefined();
  });
});
