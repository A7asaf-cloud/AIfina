import { describe, expect, it } from 'vitest';
import { calculateCashflow, localDateKey } from '../utils/cashflow';
import { StandingOrder, Transaction, UserProfile } from '../types';

const profile = { bankBalance: 10000, netSalary: 12000, salaryDay: 10, safetyBuffer: 600, creditDebt: 0, rent: 0 } as UserProfile;
const tx = (values: Partial<Transaction>): Transaction => ({
  id: 1, description: 'עסקה', amount: -100, date: '2026-09-05', cat: 'שונות', color: '#000', emoji: '📦', ...values,
});
const order = (values: Partial<StandingOrder> = {}): StandingOrder => ({
  id: 'rent-order', description: 'שכירות', amount: -4000, dayOfMonth: 15, cat: 'דיור', emoji: '🏠', color: '#000', isActive: true, ...values,
});
const sept = (day: number) => new Date(2026, 8, day, 12);

describe('calculateCashflow', () => {
  it('reserves commitments without spending unconfirmed salary', () => {
    const result = calculateCashflow(profile, [tx({ amount: -500 }), tx({ id: 2, amount: -1000, date: '2026-09-20' })], [order()], sept(9));
    expect(result.actualVariableExpenses).toBe(500);
    expect(result.expectedFixedExpenses).toBe(4000);
    expect(result.expectedVariableExpenses).toBe(1000);
    expect(result.safeToSpend).toBe(4400);
    expect(result.projectedEndBalance).toBe(17000);
    expect(result.upcoming).toHaveLength(3);
  });
  it('includes the last calendar day and uses local date keys', () => {
    const result = calculateCashflow({ ...profile, netSalary: 0 }, [tx({ date: '2026-09-30', amount: -700 })], [], sept(30));
    expect(result.actualVariableExpenses).toBe(700);
    expect(result.daysRemaining).toBe(1);
    expect(result.dailyForecast[0].date).toBe('2026-09-30');
    expect(localDateKey(new Date(2026, 8, 9, 0))).toBe('2026-09-09');
  });
  it.each([[2026, 28], [2028, 29]])('clamps recurring day 31 to February in %i', (year, lastDay) => {
    const result = calculateCashflow({ ...profile, netSalary: 0 }, [], [order({ dayOfMonth: 31 })], new Date(year, 1, 20, 12));
    expect(result.upcoming[0].date).toBe(year + '-02-' + lastDay);
  });
  it('keeps overdue and today plans unposted and carries last-month overdue plans', () => {
    const result = calculateCashflow({ ...profile, netSalary: 0 }, [
      tx({ status: 'planned', date: '2026-08-28' }),
      tx({ id: 2, status: 'pending', date: '2026-09-09', amount: -200 }),
    ], [order({ dayOfMonth: 8 })], sept(9));
    expect(result.actualVariableExpenses).toBe(0);
    expect(result.overdue).toHaveLength(2);
    expect(result.dailyForecast[0].expenses).toBe(4300);
    expect(result.projectedEndBalance).toBe(5700);
  });
  it('does not confuse incidental income with salary or duplicate linked recurring items', () => {
    const result = calculateCashflow(profile, [
      tx({ amount: 100, cat: 'הכנסה', description: 'החזר מחבר' }),
      tx({ id: 2, amount: -4000, recurringId: 'rent-order', status: 'posted' }),
    ], [order()], sept(9));
    expect(result.expectedIncome).toBe(12000);
    expect(result.upcoming.filter(i => i.source === 'standing-order')).toHaveLength(0);
  });
  it('uses profile rent only when no matching rule or transaction exists', () => {
    const rentProfile = { ...profile, netSalary: 0, rent: 4000, rentDay: 15 };
    expect(calculateCashflow(rentProfile, [], [], sept(9)).expectedFixedExpenses).toBe(4000);
    expect(calculateCashflow(rentProfile, [], [order()], sept(9)).expectedFixedExpenses).toBe(4000);
  });
  it('counts credit settlement once in bank cash flow, not again in category spending', () => {
    const result = calculateCashflow({ ...profile, netSalary: 0, creditDebt: 700, creditDay: 20 }, [
      tx({ description: 'קנייה', amount: -700, paymentMethod: 'credit', cashflowDate: '2026-09-20', settlementId: 'bill-1', status: 'posted' }),
      tx({ id: 2, description: 'חיוב כרטיס', amount: -700, kind: 'credit-settlement', settlementId: 'bill-1', date: '2026-09-20', status: 'planned' }),
    ], [], sept(9));
    expect(result.actualVariableExpenses).toBe(700);
    expect(result.expectedFixedExpenses).toBe(700);
    expect(result.projectedEndBalance).toBe(9300);
    expect(result.upcoming).toHaveLength(1);
  });
  it('reports a mid-month shortfall even if salary makes month end positive', () => {
    const result = calculateCashflow({ ...profile, bankBalance: 1000, salaryDay: 25 }, [tx({ amount: -2000, date: '2026-09-15', status: 'planned' })], [], sept(9));
    expect(result.lowestProjectedBalance).toBe(-1000);
    expect(result.lowestBalanceDate).toBe('2026-09-15');
    expect(result.projectedEndBalance).toBe(11000);
    expect(result.safeToSpend).toBe(0);
  });
  it('allocates variable reserve exactly while buffer affects spendable, not forecast', () => {
    const p = { ...profile, netSalary: 0, monthlyVariableBudget: 1000.01, safetyBuffer: 500 };
    const result = calculateCashflow(p, [tx({ amount: -200 }), tx({ id: 2, amount: -300, date: '2026-09-20', status: 'planned' })], [], sept(9));
    expect(result.variableReserve).toBe(500.01);
    expect(result.projectedEndBalance).toBe(9199.99);
    expect(result.safeToSpend).toBe(8699.99);
    const withoutBuffer = calculateCashflow({ ...p, safetyBuffer: 0 }, [tx({ amount: -200 }), tx({ id: 2, amount: -300, date: '2026-09-20', status: 'planned' })], [], sept(9));
    expect(withoutBuffer.projectedEndBalance).toBe(result.projectedEndBalance);
  });
  it('excludes cancelled and transfer items and suppresses cancelled recurring occurrences', () => {
    const result = calculateCashflow({ ...profile, netSalary: 0 }, [
      tx({ status: 'cancelled', recurringId: 'rent-order', date: '2026-09-15' }),
      tx({ id: 2, amount: 4000, kind: 'transfer' }),
    ], [order()], sept(9));
    expect(result.actualIncome).toBe(0);
    expect(result.upcoming).toHaveLength(0);
  });
  it('adjusts reported balance once only for explicitly unreflected posted bank entries', () => {
    const p = { ...profile, netSalary: 0 };
    const result = calculateCashflow(p, [
      tx({ status: 'posted', amount: -300, balanceIncluded: false }),
      tx({ id: 2, status: 'posted', amount: -200, balanceIncluded: true }),
      tx({ id: 3, status: 'planned', amount: -100, balanceIncluded: false, date: '2026-09-20' }),
    ], [], sept(9));
    expect(result.currentBalance).toBe(9700);
    expect(result.projectedEndBalance).toBe(9600);
    expect(calculateCashflow(p, [tx({ status: 'posted', amount: -300, balanceIncluded: true })], [], sept(9)).currentBalance).toBe(10000);
  });
  it('rejects invalid dates and nonfinite amounts and preserves a negative forecast', () => {
    const result = calculateCashflow({ ...profile, netSalary: 0, bankBalance: -100 }, [
      tx({ date: '2026-09-31' }), tx({ id: 2, amount: Infinity }),
    ], [], sept(9));
    expect(result.actualVariableExpenses).toBe(0);
    expect(result.projectedEndBalance).toBe(-100);
    expect(result.safeToSpend).toBe(0);
    expect(result.warnings.some(w => w.includes('לא תקין'))).toBe(true);
  });
  it('adjusts bank balance for a settled purchase or its settlement, never both', () => {
    const purchase = tx({ amount: -700, status: 'posted', paymentMethod: 'credit', cashflowDate: '2026-09-08', settlementId: 'bill-1', balanceIncluded: false });
    const p = { ...profile, netSalary: 0 };
    expect(calculateCashflow(p, [purchase], [], sept(9)).currentBalance).toBe(9300);
    const result = calculateCashflow(p, [purchase, tx({ id: 2, amount: -700, kind: 'credit-settlement', status: 'posted', date: '2026-09-08', settlementId: 'bill-1', balanceIncluded: false })], [], sept(9));
    expect(result.currentBalance).toBe(9300);
    expect(result.actualVariableExpenses).toBe(700);
    expect(result.upcoming).toHaveLength(0);
  });
  it('reserves only the remainder of entered credit debt when dated purchases are known', () => {
    const result = calculateCashflow({ ...profile, netSalary: 0, creditDebt: 1000, creditDay: 20 }, [
      tx({ amount: -700, status: 'posted', paymentMethod: 'credit', cashflowDate: '2026-09-20' }),
    ], [], sept(9));
    expect(result.projectedEndBalance).toBe(9000);
    expect(result.remainingCommitted).toBe(1000);
    expect(result.upcoming.find(i => i.source === 'credit')?.amount).toBe(-300);
  });
  it('does not allow unconfirmed same-day income to fund spending today', () => {
    const result = calculateCashflow({ ...profile, bankBalance: 500, netSalary: 0, safetyBuffer: 0 }, [
      tx({ amount: 5000, status: 'planned', date: '2026-09-09' }),
      tx({ id: 2, amount: -1000, status: 'planned', date: '2026-09-09' }),
    ], [], sept(9));
    expect(result.projectedEndBalance).toBe(4500);
    expect(result.safeToSpend).toBe(0);
  });
  it('consumes variable budget once for a posted card purchase awaiting bank settlement', () => {
    const result = calculateCashflow({ ...profile, netSalary: 0, monthlyVariableBudget: 1000 }, [
      tx({ amount: -700, status: 'posted', paymentMethod: 'credit', cashflowDate: '2026-09-20' }),
    ], [], sept(9));
    expect(result.variableReserve).toBe(300);
    expect(result.projectedEndBalance).toBe(9000);
  });
});
