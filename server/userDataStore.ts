import { getDatabase, withTransaction } from './database.js';

export async function loadUserData(userId: string): Promise<{ data: unknown; revision: number } | undefined> {
  const result = await getDatabase().query('SELECT data, revision FROM user_financial_data WHERE user_id = $1', [userId]);
  return result.rows[0] && { data: result.rows[0].data, revision: Number(result.rows[0].revision) };
}

export class RevisionConflictError extends Error {}
export async function saveUserData(userId: string, data: unknown, expectedRevision: number): Promise<number> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid financial data payload');
  const result = await getDatabase().query(`INSERT INTO user_financial_data (user_id, data, revision) VALUES ($1, $2::jsonb, 1)
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, revision = user_financial_data.revision + 1, updated_at = now()
    WHERE user_financial_data.revision = $3 RETURNING revision`, [userId, JSON.stringify(data), expectedRevision]);
  if (!result.rowCount) throw new RevisionConflictError('Financial data was changed on another device');
  return Number(result.rows[0].revision);
}

/** Deletes identity, OAuth sessions and all financial records atomically through FK cascades. */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  return withTransaction(async client => (await client.query('DELETE FROM users WHERE id = $1', [userId])).rowCount === 1);
}
