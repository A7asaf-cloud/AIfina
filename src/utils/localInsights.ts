import { BudgetPlanItem, Transaction } from '../types';
import { CashflowSummary } from './cashflow';

export interface LocalInsight { title: string; detail: string; action: 'budget' | 'transactions' }

/** Private rule-based advisor. It runs in the browser and makes no network calls. */
export function createLocalInsights(flow: CashflowSummary, transactions: Transaction[], budget: BudgetPlanItem[], month: string): LocalInsight[] {
  const actual = transactions.filter(t => t.date.startsWith(month) && t.date <= new Date().toISOString().slice(0, 10) && t.amount < 0 && (!t.status || t.status === 'posted'));
  const spent = new Map<string, number>();
  actual.forEach(t => spent.set(t.cat, (spent.get(t.cat) || 0) + Math.abs(t.amount)));
  const over = budget.map(b => ({ ...b, spent: spent.get(b.key) || 0 })).filter(b => b.amount > 0 && b.spent > b.amount).sort((a,b) => b.spent - b.amount)[0];
  const uncategorized = actual.filter(t => t.cat === 'שונות').length;
  const insights: LocalInsight[] = [];
  if (flow.lowestProjectedBalance < 0) insights.push({ title: 'מזהים פער מראש', detail: `ב־${flow.lowestBalanceDate} התחזית יורדת ליתרה של ${Math.round(flow.lowestProjectedBalance).toLocaleString('he-IL')} ₪. כדאי לבדוק הוצאה קרובה שאפשר לדחות או להקטין.`, action: 'transactions' });
  if (over) insights.push({ title: `התקציב של ${over.key} נחרג`, detail: `הוזנו ${Math.round(over.spent).toLocaleString('he-IL')} ₪ לעומת תכנון של ${Math.round(over.amount).toLocaleString('he-IL')} ₪.`, action: 'budget' });
  if (flow.overdue.length) insights.push({ title: `${flow.overdue.length} תנועות דורשות אישור`, detail: 'עדכון האם הן בוצעו ישפר את תחזית היתרה ואת הסכום הפנוי.', action: 'transactions' });
  if (uncategorized) insights.push({ title: `${uncategorized} תנועות ללא סיווג`, detail: 'סיווג קצר שלהן ישפר את תמונת התקציב כבר החודש.', action: 'transactions' });
  if (!insights.length) insights.push({ title: flow.safeToSpend > 0 ? 'החודש בידיים שלך' : 'שומרים על מרווח נשימה', detail: flow.safeToSpend > 0 ? `לפי הנתונים שהוזנו, קצב של כ־${Math.round(flow.dailyAllowance).toLocaleString('he-IL')} ₪ ביום שומר על הסכום הפנוי.` : 'היתרה הנוכחית כבר מיועדת להתחייבויות ולרשת הביטחון. עדכון תנועות עתידיות ישפר את הדיוק.', action: 'budget' });
  return insights.slice(0, 3);
}
