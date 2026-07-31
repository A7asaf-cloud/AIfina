/**
 * Tests for AI/keyword transaction categorization and CSV/Excel parsing.
 */
import { describe, it, expect } from 'vitest';
import { categorize, CATEGORIES, CAT_RULES } from '../utils/categories';
import { parseBankRows } from '../utils/bankParsers';

const VALID_CATS = Object.keys(CATEGORIES);

// ─── categorize() keyword matching ───────────────────────────────────────────

describe('categorize() keyword matching', () => {
  it('identifies income correctly', () => {
    expect(categorize('משכורת חודשית מחברת X').cat).toBe('הכנסה');
    expect(categorize('salary payment').cat).toBe('הכנסה');
    expect(categorize('זיכוי מ-AMAZON').cat).toBe('הכנסה');
  });

  it('identifies food / supermarket correctly', () => {
    expect(categorize('שופרסל דיל תל אביב').cat).toBe('מזון ושוק');
    expect(categorize('רמי לוי').cat).toBe('מזון ושוק');
    expect(categorize('וולט - מסעדת הים').cat).toBe('מזון ושוק');
    expect(categorize('מקדונלד ראשון לציון').cat).toBe('מזון ושוק');
    expect(categorize('starbucks coffee').cat).toBe('מזון ושוק');
  });

  it('identifies housing correctly', () => {
    expect(categorize('שכר דירה חודש ינואר').cat).toBe('דיור');
    expect(categorize('ארנונה עיריית תל אביב').cat).toBe('דיור');
    expect(categorize('mortgage payment').cat).toBe('דיור');
  });

  it('identifies transportation correctly', () => {
    expect(categorize('תדלוק פז רעננה').cat).toBe('תחבורה');
    expect(categorize('gett taxi').cat).toBe('תחבורה');
    expect(categorize('חניה דיזנגוף סנטר').cat).toBe('תחבורה');
    expect(categorize('רב-קו טעינה').cat).toBe('תחבורה');
  });

  it('identifies utility bills correctly', () => {
    expect(categorize('חברת החשמל - חשבון').cat).toBe('חשבונות');
    expect(categorize('פרטנר סלולר').cat).toBe('חשבונות');
    expect(categorize('bezeq broadband').cat).toBe('חשבונות');
  });

  it('identifies health correctly', () => {
    expect(categorize('מכבי שירותי בריאות').cat).toBe('בריאות');
    expect(categorize('super pharm pharmacy').cat).toBe('בריאות');
    expect(categorize('ביטוח בריאות הראל').cat).toBe('בריאות');
  });

  it('identifies entertainment correctly', () => {
    expect(categorize('netflix subscription').cat).toBe('בידור');
    expect(categorize('spotify premium').cat).toBe('בידור');
    expect(categorize('cinema city ראשון').cat).toBe('בידור');
  });

  it('identifies shopping correctly', () => {
    expect(categorize('amazon.com purchase').cat).toBe('קניות');
    expect(categorize('ZARA בגדים').cat).toBe('קניות');
    expect(categorize('ikea furniture').cat).toBe('קניות');
  });

  it('identifies savings correctly', () => {
    expect(categorize('הפקדה לקרן השתלמות').cat).toBe('חיסכון');
    expect(categorize('pension fund deposit').cat).toBe('חיסכון');
  });

  it('falls back to שונות for unknown descriptions', () => {
    expect(categorize('עסקה לא מזוהה 12345').cat).toBe('שונות');
    expect(categorize('').cat).toBe('שונות');
  });
});

describe('categorize() result metadata', () => {
  it('always returns a valid category with color and emoji', () => {
    const samples = ['שופרסל','netflix','gett taxi','משכורת','ביטוח הראל','unknown xyz','חברת החשמל'];
    for (const desc of samples) {
      const result = categorize(desc);
      expect(VALID_CATS).toContain(result.cat);
      expect(result.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(result.emoji).toBeTruthy();
    }
  });
});

// ─── CAT_RULES completeness ───────────────────────────────────────────────────

describe('CAT_RULES', () => {
  it('covers all categories except שונות (fallback)', () => {
    const covered = new Set(CAT_RULES.map(r => r.cat));
    for (const cat of VALID_CATS.filter(c => c !== 'שונות')) {
      expect(covered).toContain(cat);
    }
  });

  it('every rule has at least one keyword', () => {
    for (const rule of CAT_RULES) expect(rule.kw.length).toBeGreaterThan(0);
  });
});

// ─── parseBankRows — Israeli bank formats ─────────────────────────────────────

describe('parseBankRows — Max / Cal credit card format', () => {
  // Max exports: תאריך עסקה | תאריך חיוב | שם בית עסק | ענף | סכום עסקה | 4 ספרות | סכום חיוב
  const maxRows = [
    ['תאריך עסקה', 'תאריך חיוב', 'שם בית עסק', 'ענף', 'סכום עסקה', '4 ספרות אחרונות', 'סכום חיוב'],
    ['15/01/25', '01/02/25', 'רמי לוי', 'מזון', '150', '1234', '150'],
    ['16/01/25', '01/02/25', 'שופרסל', 'מזון', '200', '1234', '200'],
    ['17/01/25', '01/02/25', 'פז תחנת דלק', 'דלק', '300', '1234', '300'],
  ];

  it('parses business names correctly', () => {
    const result = parseBankRows(maxRows);
    expect(result.length).toBe(3);
    expect(result[0].desc).toBe('רמי לוי');
    expect(result[1].desc).toBe('שופרסל');
    expect(result[2].desc).toBe('פז תחנת דלק');
  });

  it('parses 2-digit year dates (DD/MM/YY)', () => {
    const result = parseBankRows(maxRows);
    expect(result[0].date).toBe('2025-01-15');
    expect(result[1].date).toBe('2025-01-16');
  });

  it('parses amounts correctly', () => {
    const result = parseBankRows(maxRows);
    expect(result[0].amount).toBe(150);
    expect(result[2].amount).toBe(300);
  });

  it('marks all as expense', () => {
    const result = parseBankRows(maxRows);
    expect(result.every(r => r.type === 'expense')).toBe(true);
  });
});

describe('parseBankRows — Bank Hapoalim format', () => {
  // Hapoalim: תאריך | שם/תיאור פעולה | סכום הפעולה | יתרה | אסמכתא
  const hapoalimRows = [
    ['תאריך', 'שם/תיאור פעולה', 'סכום הפעולה', 'יתרה אחרי פעולה', 'אסמכתא'],
    ['15/01/2025', 'שופרסל', '-250', '5000', '1234567'],
    ['16/01/2025', 'משכורת ינואר', '12000', '17000', '7654321'],
    ['17/01/2025', 'גט טקסי', '-45', '16955', '1111111'],
  ];

  it('parses business names correctly', () => {
    const result = parseBankRows(hapoalimRows);
    expect(result.length).toBe(3);
    expect(result[0].desc).toBe('שופרסל');
    expect(result[1].desc).toBe('משכורת ינואר');
  });

  it('distinguishes income from expense by sign', () => {
    const result = parseBankRows(hapoalimRows);
    expect(result[0].type).toBe('expense');
    expect(result[1].type).toBe('income');
  });
});

describe('parseBankRows — Bank Leumi format', () => {
  // Leumi: תאריך ביצוע | תאריך ערך | פרטים | חובה | זכות | יתרה
  const leumiRows = [
    ['תאריך ביצוע', 'תאריך ערך', 'פרטים', 'חובה', 'זכות', 'יתרה'],
    ['15/01/2025', '16/01/2025', 'רמי לוי', '180', '', '4820'],
    ['20/01/2025', '21/01/2025', 'משכורת', '', '15000', '19820'],
  ];

  it('parses debit/credit columns correctly', () => {
    const result = parseBankRows(leumiRows);
    expect(result.length).toBe(2);
    expect(result[0].desc).toBe('רמי לוי');
    expect(result[0].type).toBe('expense');
    expect(result[0].amount).toBe(180);
    expect(result[1].type).toBe('income');
    expect(result[1].amount).toBe(15000);
  });
});

describe('parseBankRows — edge cases', () => {
  it('skips summary rows (סה"כ)', () => {
    const rows = [
      ['תאריך', 'תיאור', 'סכום'],
      ['15/01/2025', 'שופרסל', '200'],
      ['', 'סה"כ', '200'],
    ];
    const result = parseBankRows(rows);
    expect(result.length).toBe(1);
  });

  it('skips rows where description is a date', () => {
    const rows = [
      ['תאריך עסקה', 'תאריך חיוב', 'שם עסק', 'סכום'],
      ['15/01/2025', '01/02/2025', 'שופרסל', '150'],
    ];
    const result = parseBankRows(rows);
    expect(result[0].desc).toBe('שופרסל');
    expect(result[0].desc).not.toMatch(/^\d{2}\/\d{2}/);
  });

  it('handles metadata rows before header', () => {
    const rows = [
      ['בנק הפועלים בע"מ'],
      ['מספר חשבון: 123456'],
      ['תקופה: 01/01/2025 - 31/01/2025'],
      ['תאריך', 'תיאור', 'סכום'],
      ['15/01/2025', 'שופרסל', '250'],
      ['16/01/2025', 'וולט', '75'],
    ];
    const result = parseBankRows(rows);
    expect(result.length).toBe(2);
    expect(result[0].desc).toBe('שופרסל');
  });

  it('handles empty / zero amount rows gracefully', () => {
    const rows = [
      ['תאריך', 'תיאור', 'סכום'],
      ['15/01/2025', 'שורה ריקה', '0'],
      ['16/01/2025', 'שופרסל', '200'],
    ];
    const result = parseBankRows(rows);
    expect(result.length).toBe(1);
    expect(result[0].desc).toBe('שופרסל');
  });
});

// ─── OCR & server category alignment ─────────────────────────────────────────

describe('OCR category mapping', () => {
  it('all OCR categories resolve via CAT_RULES exact match', () => {
    const ocrCats = ['הכנסה','מזון ושוק','דיור','תחבורה','חשבונות','בריאות','בידור','קניות','חיסכון'];
    for (const cat of ocrCats) {
      const rule = CAT_RULES.find(r => r.cat === cat);
      expect(rule, `Missing CAT_RULES entry for: ${cat}`).toBeDefined();
    }
  });

  it('OCR category list matches system CATEGORIES exactly', () => {
    const ocrCats = ['הכנסה','מזון ושוק','דיור','תחבורה','חשבונות','בריאות','בידור','קניות','חיסכון','שונות'];
    expect([...ocrCats].sort()).toEqual([...VALID_CATS].sort());
  });
});

describe('Server category normalization', () => {
  const VALID_SERVER = ['הכנסה','מזון ושוק','דיור','תחבורה','חשבונות','בריאות','בידור','קניות','חיסכון','שונות'];
  const normalize = (cat: string) => VALID_SERVER.includes(cat) ? cat : 'שונות';

  it('passes valid categories unchanged', () => {
    for (const cat of VALID_SERVER) expect(normalize(cat)).toBe(cat);
  });

  it('maps invalid AI output to שונות', () => {
    expect(normalize('סופרמרקט')).toBe('שונות');
    expect(normalize('מסעדות וקפה')).toBe('שונות');
    expect(normalize('אחר')).toBe('שונות');
    expect(normalize('')).toBe('שונות');
  });
});
