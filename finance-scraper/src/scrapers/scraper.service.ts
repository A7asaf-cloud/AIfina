import { createScraper, CompanyTypes } from 'israeli-bank-scrapers';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';
import { decrypt } from '../crypto/encryption.js';
import { logger } from '../utils/logger.js';

const CREDENTIALS_SCHEMA: Record<string, string[]> = {
  hapoalim: ['userCode', 'password'],
  leumi: ['username', 'password'],
  discount: ['id', 'password', 'num'],
  mercantile: ['id', 'password', 'num'],
  mizrahi: ['username', 'password'],
  otsarHahayal: ['username', 'password'],
  visaCal: ['username', 'password'],
  max: ['username', 'password'],
  isracard: ['id', 'card6Digits', 'password'],
  amex: ['username', 'card6Digits', 'password'],
  unionBank: ['username', 'password'],
  beinleumi: ['username', 'password'],
  massad: ['username', 'password'],
  yahav: ['username', 'password', 'nationalID'],
  beyhadBishvilha: ['id', 'password'],
  oneZero: ['email', 'password'],
};

interface OtpSession {
  scraper: ReturnType<typeof createScraper>;
  institutionId: string;
  expiresAt: number;
}

const otpSessions = new Map<string, OtpSession>();

function cleanExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of otpSessions) {
    if (session.expiresAt < now) otpSessions.delete(id);
  }
}

function validateCredentials(companyId: string, credentials: Record<string, string>): void {
  const required = CREDENTIALS_SCHEMA[companyId];
  if (!required) throw new Error(`Unknown company_id: ${companyId}`);
  const missing = required.filter((k) => !credentials[k]);
  if (missing.length) throw new Error(`Missing credential fields: ${missing.join(', ')}`);
}

export async function scrapeInstitution(
  institutionId: string
): Promise<{ status: string; sessionId?: string; transactionsNew?: number }> {
  const db = getDb();
  const institution = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as
    | Record<string, unknown>
    | undefined;

  if (!institution) throw new Error(`Institution not found: ${institutionId}`);

  const credentials = JSON.parse(decrypt(institution.credentials_encrypted as string)) as Record<string, string>;
  validateCredentials(institution.company_id as string, credentials);

  const logId = uuidv4();
  const startedAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO scrape_logs (id, institution_id, started_at, status) VALUES (?, ?, ?, ?)'
  ).run(logId, institutionId, startedAt, 'running');

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  try {
    const scraper = createScraper({
      companyId: institution.company_id as keyof typeof CompanyTypes,
      startDate,
      combineInstallments: false,
      showBrowser: false,
    });

    // @ts-expect-error — scraper.onOtpRequest is library-defined
    scraper.onOtpRequest = (_prompt: unknown) => {
      const sessionId = uuidv4();
      otpSessions.set(sessionId, {
        scraper,
        institutionId,
        expiresAt: Date.now() + 5 * 60 * 1000,
      });
      return Promise.reject({ otpRequired: true, sessionId });
    };

    const result = await scraper.scrape(credentials);

    if (!result.success) throw new Error(result.errorMessage ?? 'Scrape failed');

    let transactionsFound = 0;
    let transactionsNew = 0;

    for (const account of result.accounts ?? []) {
      for (const txn of account.txns ?? []) {
        transactionsFound++;
        const txnId = uuidv4();
        const identifier =
          (txn as Record<string, unknown>).identifier?.toString() ??
          `${institutionId}-${txn.date}-${txn.chargedAmount}-${txn.description}`;

        const changes = db
          .prepare(
            `INSERT OR IGNORE INTO transactions
              (id, institution_id, account_number, date, processed_date, description, amount,
               original_amount, original_currency, charged_amount, type, status,
               installment_number, installment_total, memo, identifier)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          )
          .run(
            txnId,
            institutionId,
            account.accountNumber ?? '',
            txn.date,
            (txn as Record<string, unknown>).processedDate?.toString() ?? null,
            txn.description,
            txn.chargedAmount,
            (txn as Record<string, unknown>).originalAmount ?? null,
            (txn as Record<string, unknown>).originalCurrency ?? 'ILS',
            txn.chargedAmount,
            txn.type ?? null,
            txn.status ?? null,
            (txn as Record<string, unknown>).installments
              ? ((txn as Record<string, unknown>).installments as Record<string, unknown>).number
              : null,
            (txn as Record<string, unknown>).installments
              ? ((txn as Record<string, unknown>).installments as Record<string, unknown>).total
              : null,
            txn.memo ?? null,
            identifier
          );
        if (changes.changes > 0) transactionsNew++;
      }
    }

    db.prepare(
      'UPDATE institutions SET last_scraped_at = ? WHERE id = ?'
    ).run(new Date().toISOString(), institutionId);

    db.prepare(
      `UPDATE scrape_logs SET finished_at = ?, status = ?, transactions_found = ?, transactions_new = ?
       WHERE id = ?`
    ).run(new Date().toISOString(), 'success', transactionsFound, transactionsNew, logId);

    return { status: 'success', transactionsNew };
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    if (e.otpRequired) {
      return { status: 'otp_required', sessionId: e.sessionId as string };
    }

    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Scrape failed for ${institutionId}: ${message}`);
    db.prepare(
      'UPDATE scrape_logs SET finished_at = ?, status = ?, error_message = ? WHERE id = ?'
    ).run(new Date().toISOString(), 'error', message, logId);
    throw err;
  }
}

export async function continueWithOtp(
  sessionId: string,
  otpCode: string
): Promise<{ status: string; transactionsNew?: number }> {
  cleanExpiredSessions();
  const session = otpSessions.get(sessionId);
  if (!session) throw new Error('OTP session expired or not found');
  otpSessions.delete(sessionId);

  // Resume the scraper with the OTP code
  // The library resolves the pending OTP promise via its internal callback
  // @ts-expect-error — internal method
  session.scraper.resolveOtp?.(otpCode);

  return { status: 'otp_submitted' };
}

export function getCredentialsSchema(): Record<string, string[]> {
  return CREDENTIALS_SCHEMA;
}
