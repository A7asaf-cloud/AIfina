import { describe, expect, it } from 'vitest';
import { createLocalInsights } from '../utils/localInsights';

const flow: any = { lowestProjectedBalance: -50, lowestBalanceDate: '2026-09-28', overdue: [], safeToSpend: 0, dailyAllowance: 0 };
it('prioritizes a projected cashflow gap without a network dependency', () => {
  const insights = createLocalInsights(flow, [], [], '2026-09');
  expect(insights[0].title).toBe('מזהים פער מראש');
  expect(insights[0].action).toBe('transactions');
});
it('detects budget overspend from local transactions', () => {
  const insights = createLocalInsights({ ...flow, lowestProjectedBalance: 5 }, [{ id: 1, date: new Date().toISOString().slice(0,10), amount: -250, cat: 'מזון ושוק', status: 'posted' } as any], [{ key: 'מזון ושוק', amount: 100 } as any], new Date().toISOString().slice(0,7));
  expect(insights[0].title).toContain('מזון ושוק');
});
