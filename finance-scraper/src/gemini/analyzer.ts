import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';
import { logger } from '../utils/logger.js';

const MODEL = 'gemini-2.0-flash';

function getClient(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  return new GoogleGenerativeAI(key);
}

const CATEGORIES = 'מזון|תחבורה|בילויים|חשבונות|קניות|בריאות|חינוך|אחר';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function categorizeTransactions(transactions: { id: string; description: string; amount: number }[]): Promise<void> {
  const db = getDb();
  const model = getClient().getGenerativeModel({ model: MODEL });
  const batches = [];
  for (let i = 0; i < transactions.length; i += 50) batches.push(transactions.slice(i, i + 50));

  for (const batch of batches) {
    const prompt = `
אתה מסייע לסיווג עסקאות פיננסיות. עבור כל עסקה, החזר קטגוריה מהרשימה: ${CATEGORIES}.
החזר JSON בלבד בפורמט: [{"id":"...","category":"..."}]

עסקאות:
${JSON.stringify(batch.map((t) => ({ id: t.id, description: t.description, amount: t.amount })))}
    `.trim();

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const json = text.startsWith('[') ? text : text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const categorized = JSON.parse(json) as { id: string; category: string }[];

      const update = db.prepare('UPDATE transactions SET category = ? WHERE id = ?');
      for (const item of categorized) update.run(item.category, item.id);
    } catch (err) {
      logger.error('Gemini categorize failed', { err });
    }

    if (batches.indexOf(batch) < batches.length - 1) await sleep(1000);
  }
}

export async function generateMonthlyInsight(
  year: number,
  month: number,
  transactions: { id: string; description: string; amount: number; category?: string; date: string }[]
): Promise<object> {
  const model = getClient().getGenerativeModel({ model: MODEL });
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-31`;

  const prompt = `
אתה אנליסט פיננסי. נתח את העסקאות הבאות לחודש ${month}/${year} והחזר JSON בלבד:
{
  "summary": { "total_expense": <number>, "by_category": { "<category>": <number> } },
  "top_transactions": [{ "description": "...", "amount": ... }],
  "anomalies": [{ "description": "...", "amount": ..., "reason": "..." }],
  "vs_previous_month": { "diff_pct": <number>, "note": "..." },
  "saving_tip": "..."
}

עסקאות:
${JSON.stringify(transactions.slice(0, 50))}
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const json = text.startsWith('{') ? text : text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const content = JSON.parse(json) as object;

    const db = getDb();
    db.prepare(
      `INSERT INTO ai_insights (id, period_start, period_end, insight_type, content)
       VALUES (?, ?, ?, ?, ?)`
    ).run(uuidv4(), periodStart, periodEnd, 'monthly', JSON.stringify(content));

    return content;
  } catch (err) {
    logger.error('Gemini monthly insight failed', { err });
    throw err;
  }
}

export async function detectAnomalies(
  transactions: { id: string; description: string; amount: number; date: string }[]
): Promise<object[]> {
  const model = getClient().getGenerativeModel({ model: MODEL });

  const prompt = `
זהה חריגות בעסקאות הבאות: חיובים כפולים, סכומים חריגים, ספקים לא מוכרים.
החזר JSON בלבד: [{"transaction_id":"...","reason":"...","severity":"low|medium|high"}]

עסקאות:
${JSON.stringify(transactions.slice(0, 50))}
  `.trim();

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const json = text.startsWith('[') ? text : text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(json) as object[];
  } catch (err) {
    logger.error('Gemini anomaly detection failed', { err });
    throw err;
  }
}
