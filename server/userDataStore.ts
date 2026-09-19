import { getDatabase, withTransaction } from './database.js';

export async function loadUserData(userId: string): Promise<unknown | undefined> {
  const result = await getDatabase().query('SELECT data FROM user_financial_data WHERE user_id = $1', [userId]);
  return result.rows[0]?.data;
}

export async function saveUserData(userId: string, data: unknown): Promise<void> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid financial data payload');
  await getDatabase().query(`INSERT INTO user_financial_data (user_id, data) VALUES ($1, $2::jsonb)
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, revision = user_financial_data.revision + 1, updated_at = now()`, [userId, JSON.stringify(data)]);
}

/** Deletes identity, OAuth sessions and all financial records atomically through FK cascades. */
export async function deleteUserAccount(userId: string): Promise<boolean> {
  return withTransaction(async client => (await client.query('DELETE FROM users WHERE id = $1', [userId])).rowCount === 1);
}
