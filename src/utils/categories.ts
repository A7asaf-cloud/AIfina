/**
 * FinanceIL - Categories & Budget Allocation Rules
 */
import { CategoryRule, BudgetPlanItem, Transaction } from '../types';

export const CAT_RULES: CategoryRule[] = [
  { kw: ['שופרסל', 'רמי לוי', 'ויקטורי', 'מגה', 'יינות ביתן', 'אושר עד', 'חצי חינם', 'אמפמ', 'am:pm', 'fresh market', 'קשת טעמים', 'טיב טעם', 'rami levy', 'shufersal', 'סופרמרקט', 'מכולת', 'aldi', 'carrefour', 'כרפור', 'ספייסר', 'שוק', 'מינימרקט', 'convenience', 'grocery', 'food store', 'superstore'], cat: 'סופרמרקט', color: '#22C55E', emoji: '🛒' },
  { kw: ['וולט', 'wolt', 'מקדונלד', 'mcdonald', 'קפה', 'cafe', 'coffee', 'מסעדה', 'פיצה', 'pizza', 'סושי', 'בורגר', 'תן ביס', '10bis', 'ארומה', 'גולדה', 'ריבר', 'לנדוור', 'ריבר סושי', 'domino', 'kfc', 'burger king', 'שווארמה', 'פלאפל', 'hummus', 'חומוס', 'bar ', 'pub', 'restaurant', 'אוכל', 'גריל', 'גרגרים', 'אינדיאני', 'יפני', 'טאקו', 'starbucks'], cat: 'מסעדות וקפה', color: '#F97316', emoji: '🍽️' },
  { kw: ['ארנונה', 'עיריית', 'עירייה', 'municipality', 'אגרה', 'היטל'], cat: 'ארנונה', color: '#8B5CF6', emoji: '🏛️' },
  { kw: ['hot', 'הוט', 'netflix', 'נטפליקס', 'spotify', 'ספוטיפיי', 'yes', 'יס', 'disney', 'apple tv', 'youtube', 'steam', 'cinema', 'סינמה', 'קולנוע', 'הbo', 'hbo', 'paramount', 'apple music', 'deezer', 'tidal', 'google play', 'app store', 'gaming', 'playstation', 'xbox', 'nintendo', 'twitch', 'כרטיס ראינוע', 'yes planet', 'cinema city'], cat: 'בידור', color: '#EC4899', emoji: '🎬' },
  { kw: ['partner', 'פרטנר', 'cellcom', 'סלקום', 'פלאפון', 'pelephone', 'bezeq', 'בזק', 'golan', 'גולן', '012', 'רנט', 'rami levi com', 'internet', 'אינטרנט', '019', '017', 'ברנט', 'hot mobile', 'hotmobile', 'xfone', 'ex phone', ' telecom'], cat: 'תקשורת', color: '#06B6D4', emoji: '📱' },
  { kw: ['paz', 'פז', 'sonol', 'סונול', 'דלק', 'fuel', 'yellow', 'דור אלון', 'טנגו', 'ten ', 'טן ', 'orio', 'אוריו', 'gil', 'גיל דלק', 'petrol', 'gas station', 'תדלוק', 'נסיעה', 'driving', 'car wash', 'שטיפת רכב', 'ביטוח רכב', 'רישוי', 'טסט', 'מוסך', 'spare parts', 'אלדי ים', 'delek', 'gulf', 'pi glilot'], cat: 'דלק ורכב', color: '#84CC16', emoji: '⛽' },
  { kw: ['אגד', 'דן', 'רב-קו', 'rav-kav', 'ravkav', 'רכבת ישראל', 'israel railways', 'גט', 'gett', 'yango', 'יאנגו', 'bolt', 'taxi', 'מונית', 'חניה', 'parking', 'אחוזות החוף', 'פנגו', 'pango', 'cello', 'סלו', 'אוטובוס', 'bus', 'metro', 'tram', 'uber', 'lyft', 'ride', 'transfer', 'shuttle', 'airport', 'נמל תעופה'], cat: 'תחבורה', color: '#3B82F6', emoji: '🚌' },
  { kw: ['חברת החשמל', 'iec ', 'חשמל', 'electricity', 'מים', 'water', 'ועד בית', 'house committee', 'גז', 'gas', 'אמישראגז', 'סופרגז', 'שב"א', 'שמש', 'solar', 'בזק ב', 'cable', 'פסגות', 'חום', 'קירור', 'maintenance', 'תחזוקה', 'עמידר', 'שכרות', 'handy'], cat: 'חשבונות בית', color: '#EAB308', emoji: '💡' },
  { kw: ['ביטוח', 'insurance', 'הראל ביטוח', 'מנורה ביטוח', 'כלל ביטוח', 'מגדל ביטוח', 'איילון', 'פניקס', 'aig', 'הפניקס', 'סיכון', 'risk', 'policy', 'פוליסה', 'premiums'], cat: 'ביטוח', color: '#6366F1', emoji: '🛡️' },
  { kw: ['מכבי', 'כללית', 'לאומית', 'מאוחדת', 'סופר-פארם', 'super pharm', 'superpharm', 'תרופות', 'pharmacy', 'בית מרקחת', 'קופת חולים', 'מרפאה', 'clinic', 'doctor', 'רופא', 'hospital', 'בית חולים', 'dental', 'שיניים', 'optic', 'משקפיים', 'gym', 'כושר', 'sport', 'ספורט', 'fitness', 'pilates', 'yoga', 'health', 'wellness'], cat: 'בריאות', color: '#14B8A6', emoji: '🏥' },
  { kw: ['amazon', 'אמזון', 'aliexpress', 'ali express', 'ebay', 'זארה', 'zara', 'h&m', 'hm ', 'קסטרו', 'castro', 'קניון', 'mall', 'ksp', 'אייבורי', 'ivory', 'איקאה', 'ikea', 'עליאקספרס', 'shein', 'שאין', 'טרמינל', 'terminal', 'factory 54', 'fox', 'פוקס', 'renuar', 'רנואר', 'golf', 'גולף', 'adidas', 'nike', 'puma', 'fashion', 'clothing', 'apparel', 'shoes', 'footwear', 'נעליים', 'בגדים', 'walmart', 'target', 'best buy', 'mediamarkt'], cat: 'קניות', color: '#F59E0B', emoji: '🛍️' },
  { kw: ['שכר דירה', 'שכירות', 'rent', 'mortgage', 'משכנתה', 'משכנתא', 'דמי שכירות', 'housing', 'apartment', 'דירה'], cat: 'דיור', color: '#64748B', emoji: '🏠' },
  { kw: ['משכורת', 'שכר', 'הכנסה', 'income', 'salary', 'wage', 'bonus', 'בונוס', 'החזר', 'זיכוי', 'credit', 'refund', 'העברה נכנסת', 'transfer in', 'הפקדה', 'deposit received', 'פיצויים', 'מענק'], cat: 'הכנסה', color: '#10B981', emoji: '💰' },
];

export const DEF_CAT = { cat: 'אחר', color: '#9CA3AF', emoji: '📦' };

export const ALL_CATS = [
  ...CAT_RULES.map((r) => ({ cat: r.cat, color: r.color, emoji: r.emoji })),
  DEF_CAT,
];

export function categorize(desc: string): { cat: string; color: string; emoji: string } {
  if (!desc || typeof desc !== 'string') return { ...DEF_CAT };
  const low = desc.toLowerCase().trim();
  for (const r of CAT_RULES) {
    for (const kw of r.kw) {
      if (low.includes(kw.toLowerCase())) {
        return { cat: r.cat, color: r.color, emoji: r.emoji };
      }
    }
  }
  return { ...DEF_CAT };
}

export const DEFAULT_BUDGET_PLAN: BudgetPlanItem[] = [
  { key: 'דיור', pct: 30, color: '#64748B', emoji: '🏠' },
  { key: 'מזון ושוק', pct: 15, color: '#22C55E', emoji: '🛒' },
  { key: 'תחבורה', pct: 10, color: '#3B82F6', emoji: '🚌' },
  { key: 'חשבונות', pct: 8, color: '#EAB308', emoji: '💡' },
  { key: 'בריאות', pct: 5, color: '#14B8A6', emoji: '🏥' },
  { key: 'בידור', pct: 7, color: '#EC4899', emoji: '🎬' },
  { key: 'חיסכון', pct: 15, color: '#F59E0B', emoji: '💰' },
  { key: 'שונות', pct: 10, color: '#9CA3AF', emoji: '📦' },
];

export const CAT_TO_BUDGET: Record<string, string> = {
  'סופרמרקט': 'מזון ושוק',
  'מסעדות וקפה': 'מזון ושוק',
  'ארנונה': 'חשבונות',
  'חשבונות בית': 'חשבונות',
  'תקשורת': 'חשבונות',
  'דלק ורכב': 'תחבורה',
  'תחבורה': 'תחבורה',
  'בידור': 'בידור',
  'ביטוח': 'בריאות',
  'בריאות': 'בריאות',
  'קניות': 'שונות',
  'דיור': 'דיור',
  'אחר': 'שונות',
};

export function calcBudget(netSalary: number, plan: BudgetPlanItem[]): BudgetPlanItem[] {
  const currentPlan = plan && plan.length ? plan : DEFAULT_BUDGET_PLAN;
  return currentPlan.map((b) => ({
    ...b,
    amount: Math.round((netSalary * b.pct) / 100),
  }));
}

export function spentPerBudget(txs: Transaction[], budget: BudgetPlanItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  budget.forEach((b) => {
    map[b.key] = 0;
  });
  const now = new Date();
  txs
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const d = new Date(t.date);
      if (
        !isNaN(d.getTime()) &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        const bk = CAT_TO_BUDGET[t.cat] || 'שונות';
        if (map[bk] !== undefined) {
          map[bk] += Math.abs(t.amount);
        }
      }
    });
  return map;
}
