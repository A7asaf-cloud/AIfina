import { afterEach, describe, expect, it, vi } from 'vitest';
import { importStatementWithGemini, parseGeminiTransactions } from '../utils/geminiStatementImport';

describe('Gemini statement import', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps only complete and valid transactions from an AI response', () => {
    const result = parseGeminiTransactions([{ date: '2026-09-12', description: 'רמי לוי', amount: -125.5, cat: 'מזון ושוק' }, { date: 'today', description: 'לא תקין', amount: -1 }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ description: 'רמי לוי', amount: -125.5, cat: 'מזון ושוק', account: 'ייבוא Gemini' });
  });

  it('sends the file to Gemini and returns validated transactions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '[{"date":"2026-09-12","description":"פז","amount":-250,"cat":"תחבורה"}]' }] } }] }), { status: 200 }));
    const result = await importStatementWithGemini('תאריך,תיאור,סכום\\n12/09/2026,פז,-250', 'test-key');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('generativelanguage.googleapis.com'), expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ 'x-goog-api-key': 'test-key' }) }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ description: 'פז', amount: -250, cat: 'תחבורה' });
  });
});
