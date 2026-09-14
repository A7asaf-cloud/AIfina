import { afterEach, describe, expect, it, vi } from 'vitest';
import { importStatementWithGemini, parseGeminiTransactions } from '../utils/geminiStatementImport';

const modelsResponse = () => new Response(JSON.stringify({ models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] }] }), { status: 200 });
const transactionResponse = (amount = -20) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: `[{"date":"2026-09-12","description":"פז","amount":${amount},"cat":"תחבורה"}]` }] } }] }), { status: 200 });

describe('Gemini statement import', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps only complete and valid transactions from an AI response', () => {
    const result = parseGeminiTransactions([{ date: '2026-09-12', description: 'רמי לוי', amount: -125.5, cat: 'מזון ושוק' }, { date: 'today', description: 'לא תקין', amount: -1 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ description: 'רמי לוי', amount: -125.5, cat: 'מזון ושוק', account: 'ייבוא Gemini' });
  });

  it('normalizes common Gemini date, amount and type variants', () => {
    const result = parseGeminiTransactions([
      { transactionDate: '12/09/2026', merchant: 'סופר פארם', amount: '1,234.50', type: 'expense', cat: 'בריאות' },
      { date: '13.09.26', name: 'משכורת', sum: '10,000', type: 'income', cat: 'הכנסה' },
    ]);
    expect(result).toMatchObject([
      { date: '2026-09-12', description: 'סופר פארם', amount: -1234.5, cat: 'בריאות' },
      { date: '2026-09-13', description: 'משכורת', amount: 10000, cat: 'הכנסה' },
    ]);
  });

  it('uses explicit direction when Gemini returns unsigned amounts', () => {
    const result = parseGeminiTransactions([{ date: '2026-09-12', description: 'משכורת', amount: 12000, type: 'income' }, { date: '2026-09-12', description: 'קנייה', amount: 90, type: 'expense' }]);
    expect(result.map(transaction => transaction.amount)).toEqual([12000, -90]);
  });

  it('sends the file to Gemini and returns validated transactions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => String(url).endsWith('/models') ? modelsResponse() : transactionResponse(-250));
    const result = await importStatementWithGemini('תאריך,תיאור,סכום\\n12/09/2026,פז,-250', 'test-key');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('generativelanguage.googleapis.com'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-goog-api-key': 'test-key' }) }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ description: 'פז', amount: -250, cat: 'תחבורה' });
  });

  it('retries a temporary 503 and falls back to another model', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(modelsResponse())
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(transactionResponse());
    const result = await importStatementWithGemini('קובץ עסקה', 'test-key');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][0]).toContain('gemini-2.5-flash');
    expect(result).toHaveLength(1);
  });

  it('falls back to another model when the first one returns 404', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(modelsResponse())
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(transactionResponse());
    const result = await importStatementWithGemini('קובץ עסקה', 'test-key');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][0]).toContain('gemini-2.5-flash');
    expect(result).toHaveLength(1);
  });
});
