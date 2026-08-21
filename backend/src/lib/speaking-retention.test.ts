import assert from 'node:assert/strict';
import test from 'node:test';
import { purgeExpiredSpeakingRecordings } from './speaking-retention';

test('retention removes metadata only after object deletion succeeds', async () => {
  const deletedObjects: string[] = []; const batched: unknown[] = [];
  const statement = { bind: (...values: unknown[]) => ({ all: async () => ({ results: values.length === 2 && values[1] === 100 ? [{ id: 'ok', object_key: 'one' }, { id: 'failed', object_key: 'two' }] : [] }) }) };
  const env = { DB: { prepare: () => statement, batch: async (items: unknown[]) => { batched.push(...items); return []; } } as unknown as D1Database, SPEAKING_RECORDINGS: { delete: async (key: string) => { if (key === 'two') throw new Error('R2 unavailable'); deletedObjects.push(key); } } as unknown as R2Bucket };
  const result = await purgeExpiredSpeakingRecordings(env, new Date('2026-08-12T03:00:00Z'));
  assert.deepEqual(result, { scanned: 2, deleted: 1, failed: 1 }); assert.deepEqual(deletedObjects, ['one']); assert.equal(batched.length, 1);
});
