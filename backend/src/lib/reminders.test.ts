import assert from 'node:assert/strict';
import test from 'node:test';
import { sendDueSimulationReminders } from './reminders';

test('reminder job is a no-op when no opted-in schedule is due', async () => {
  const env = { DB: { prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) }) } as unknown as D1Database, APP_URL: 'http://localhost:5173' };
  assert.deepEqual(await sendDueSimulationReminders(env), { scanned: 0, sent: 0, failed: 0 });
});
