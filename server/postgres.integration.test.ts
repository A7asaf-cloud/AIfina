import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDatabase, getDatabase, initializeDatabase } from './database.js';
import { deleteUserAccount, loadUserData, RevisionConflictError, saveUserData } from './userDataStore.js';
import { saveAuthUser } from './authFileStore.js';

const enabled = Boolean(process.env.DATABASE_URL?.includes('aifina_test'));
const users = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'a@test.example', name: 'A', avatarUrl: '', googleId: '', isVerified: true, tokenVersion: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '22222222-2222-4222-8222-222222222222', email: 'b@test.example', name: 'B', avatarUrl: '', googleId: '', isVerified: true, tokenVersion: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

describe.skipIf(!enabled)('PostgreSQL integration', () => {
  beforeAll(async () => { await initializeDatabase(); await getDatabase().query('TRUNCATE users CASCADE'); });
  afterAll(closeDatabase);
  it('migrates an empty database idempotently and persists isolated financial data', async () => {
    await initializeDatabase(); await Promise.all(users.map(saveAuthUser));
    await saveUserData(users[0].id, { transactions: [{ id: 'a-1', amount: -10 }], profile: { name: 'A' } }, 0);
    await saveUserData(users[1].id, { transactions: [{ id: 'b-1', amount: -20 }], profile: { name: 'B' } }, 0);
    expect(await loadUserData(users[0].id)).toMatchObject({ data: { transactions: [{ id: 'a-1', amount: -10 }], profile: { name: 'A' } }, revision: 1 });
    expect(await loadUserData(users[1].id)).toMatchObject({ data: { transactions: [{ id: 'b-1', amount: -20 }], profile: { name: 'B' } }, revision: 1 });
    await closeDatabase(); await initializeDatabase();
    expect(await loadUserData(users[0].id)).toMatchObject({ data: { profile: { name: 'A' } } });
  });
  it('deletes an account and cascades its financial document', async () => {
    expect(await deleteUserAccount(users[0].id)).toBe(true);
    expect(await loadUserData(users[0].id)).toBeUndefined();
    expect(await loadUserData(users[1].id)).toMatchObject({ data: { profile: { name: 'B' } } });
  });
  it('allows one atomic update per revision', async () => {
    await expect(Promise.allSettled([
      saveUserData(users[1].id, { profile: { name: 'new' } }, 1),
      saveUserData(users[1].id, { profile: { name: 'stale' } }, 1),
    ])).resolves.toEqual(expect.arrayContaining([{ status: 'fulfilled', value: 2 }, { status: 'rejected', reason: expect.any(RevisionConflictError) }]));
  });
});
