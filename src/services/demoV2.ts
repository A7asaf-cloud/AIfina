import { UserAppData, Transaction } from '../types';
import { CATEGORIES, CategoryKey } from '../utils/categories';

/** Browser-local sample account, never mixed with a personal user's records. */
export function createDemoV2(now = new Date()): UserAppData {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const date = (day: number) => `${month}-${String(Math.min(last, day)).padStart(2, '0')}`;
  const tx = (id: string, description: string, amount: number, day: number, cat: CategoryKey, fixed = false): Transaction => ({
    id, description, amount, date: date(day), cat, ...CATEGORIES[cat],
    status: day <= now.getDate() ? 'posted' : 'planned',
    expenseType: fixed ? 'fixed' : 'variable', paymentMethod: 'bank', account: 'חשבון הדגמה',
  });
  return {
    profile: {
      name: 'אסף', netSalary: 16500, grossSalary: 22000, salaryDay: 10, creditDay: 18,
      bankBalance: 12840, creditDebt: 0, rent: 4800, rentDay: 15,
      balanceAsOf: date(now.getDate()), safetyBuffer: 2500, monthlyVariableBudget: 4500,
      hasKeren: false, kerenEmp: 0, kerenEr: 0, hasPension: false, pensionEmp: 0, pensionEr: 0,
      createdAt: now.toISOString(), onboardingDone: true,
    },
    transactions: [
      tx('demo-side-income', 'פרויקט עצמאי', 2400, 2, 'הכנסה'),
      tx('demo-groceries', 'קניות לשבוע · שופרסל', -684, 3, 'מזון ושוק'),
      tx('demo-coffee', 'קפה של שישי', -92, 4, 'מזון ושוק'),
      tx('demo-fuel', 'תדלוק הרכב', -286, 5, 'תחבורה'),
      tx('demo-food', 'קניות להשלמות', -248, 6, 'מזון ושוק'),
      tx('demo-health', 'בית מרקחת', -138, 7, 'בריאות'),
      tx('demo-dinner', 'ארוחת ערב בחוץ', -214, 8, 'מזון ושוק'),
      tx('demo-power', 'חשבון חשמל', -420, 20, 'חשבונות', true),
      tx('demo-gift', 'מתנה ליום הולדת', -350, 24, 'קניות'),
      tx('demo-rent', 'שכר דירה', -4800, 15, 'דיור', true),
    ],
    standingOrders: [
      { id: 'demo-phone', description: 'אינטרנט וסלולר', amount: -179, dayOfMonth: 12, cat: 'חשבונות', ...CATEGORIES['חשבונות'], isActive: true },
      { id: 'demo-insurance', description: 'ביטוח רכב', amount: -310, dayOfMonth: 18, cat: 'תחבורה', ...CATEGORIES['תחבורה'], isActive: true },
    ],
    budgetPlan: [
      { key: 'דיור', pct: 30, ...CATEGORIES['דיור'] },
      { key: 'מזון ושוק', pct: 14, ...CATEGORIES['מזון ושוק'] },
      { key: 'תחבורה', pct: 6, ...CATEGORIES['תחבורה'] },
      { key: 'בריאות', pct: 3, ...CATEGORIES['בריאות'] },
      { key: 'קניות', pct: 5, ...CATEGORIES['קניות'] },
      { key: 'חשבונות', pct: 7, ...CATEGORIES['חשבונות'] },
      { key: 'בידור', pct: 5, ...CATEGORIES['בידור'] },
      { key: 'חיסכון', pct: 20, ...CATEGORIES['חיסכון'] },
      { key: 'שונות', pct: 10, ...CATEGORIES['שונות'] },
    ],
    investments: { kerenValue: 0, pensionValue: 0, savings: [], moneyMarket: [], portfolioHoldings: [], portfolioCash: 0, portfolioHistory: [] },
    snapshots: {}, customRules: {},
  };
}
