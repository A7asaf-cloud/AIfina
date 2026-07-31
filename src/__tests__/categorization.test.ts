/**
 * Tests for AI/keyword transaction categorization.
 * CSV/Excel parsing is now handled by Gemini AI via /api/parse-statement.
 */
import { describe, it, expect } from 'vitest';
import { categorize, CATEGORIES, CAT_RULES } from '../utils/categories';

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

// ─── OCR & server category alignment ─────────────────────────────────────────

describe('OCR / parse-statement category mapping', () => {
  const SERVER_CATS = ['הכנסה','מזון ושוק','דיור','תחבורה','חשבונות','בריאות','בידור','קניות','חיסכון','שונות'];

  it('server category list matches system CATEGORIES exactly', () => {
    expect([...SERVER_CATS].sort()).toEqual([...VALID_CATS].sort());
  });

  it('all server categories resolve via CAT_RULES exact match (except שונות)', () => {
    for (const cat of SERVER_CATS.filter(c => c !== 'שונות')) {
      const rule = CAT_RULES.find(r => r.cat === cat);
      expect(rule, `Missing CAT_RULES entry for: ${cat}`).toBeDefined();
    }
  });
});

describe('Server category normalization', () => {
  const VALID = ['הכנסה','מזון ושוק','דיור','תחבורה','חשבונות','בריאות','בידור','קניות','חיסכון','שונות'];
  const normalize = (cat: string) => VALID.includes(cat) ? cat : 'שונות';

  it('passes valid categories unchanged', () => {
    for (const cat of VALID) expect(normalize(cat)).toBe(cat);
  });

  it('maps invalid AI output to שונות', () => {
    expect(normalize('סופרמרקט')).toBe('שונות');
    expect(normalize('מסעדות וקפה')).toBe('שונות');
    expect(normalize('אחר')).toBe('שונות');
    expect(normalize('')).toBe('שונות');
  });
});
