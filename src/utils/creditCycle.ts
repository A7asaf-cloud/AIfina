import { Transaction, UserProfile } from '../types';
const pad = (value: number) => String(value).padStart(2, '0');
const clampDay = (year: number, month: number, day: number) => Math.min(Math.max(1, day), new Date(year, month + 1, 0).getDate());
const dateKey = (year: number, month: number, day: number) => String(year) + '-' + pad(month + 1) + '-' + pad(clampDay(year, month, day));
export const creditSettlementDate = (purchaseDate: string, profile: Pick<UserProfile, 'creditDay' | 'creditCycleDay'>) => {
  const [year, month, day] = purchaseDate.slice(0, 10).split('-').map(Number);
  if (!year || !Number.isInteger(month) || !day) return purchaseDate;
  const cycleDay = Math.min(31, Math.max(1, Number(profile.creditCycleDay || profile.creditDay || 1)));
  const debitDay = Math.min(31, Math.max(1, Number(profile.creditDay || cycleDay)));
  let dueMonth = month - 1 + (day >= cycleDay ? 1 : 0); let dueYear = year;
  if (dueMonth > 11) { dueMonth = 0; dueYear += 1; }
  let settlement = dateKey(dueYear, dueMonth, debitDay);
  if (settlement <= purchaseDate.slice(0, 10)) { dueMonth += 1; if (dueMonth > 11) { dueMonth = 0; dueYear += 1; } settlement = dateKey(dueYear, dueMonth, debitDay); }
  return settlement;
};
export const assignImportedCreditCycle = (transactions: Transaction[], profile: Pick<UserProfile, 'creditDay' | 'creditCycleDay'>) => transactions.map(tx => {
  if (tx.amount >= 0) return tx;
  const cashflowDate = creditSettlementDate(tx.date, profile);
  return { ...tx, paymentMethod: 'credit' as const, cashflowDate, settlementId: 'credit-' + cashflowDate, account: tx.account || 'כרטיס אשראי' };
});
