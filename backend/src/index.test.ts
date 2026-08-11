import assert from 'node:assert/strict';
import test from 'node:test';
import app from './index';

function bindings(database: { prepare: () => { first: () => Promise<unknown> } }) {
  return {
    DB: database as unknown as D1Database,
    PAYMENT_PROOFS: {} as R2Bucket,
    SESSION_SECRET: 'test-secret-that-is-long-enough', ADMIN_EMAIL: 'admin@example.com', WHATSAPP_NUMBER: '212000000000', CIH_ACCOUNT_NUMBER: 'test', APP_URL: 'http://localhost:5173',
  };
}

test('liveness returns a traceable response without checking dependencies', async () => {
  const response = await app.request('/api/health/live', {}, bindings({ prepare: () => ({ first: async () => { throw new Error('must not run'); } }) }));
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('X-Request-ID'));
  assert.equal((await response.json() as { status: string }).status, 'alive');
});

test('readiness reports a healthy database', async () => {
  const response = await app.request('/api/health', {}, bindings({ prepare: () => ({ first: async () => ({ ready: 1 }) }) }));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json() as { dependencies: unknown }).dependencies, { database: 'ready' });
});

test('readiness degrades safely when D1 is unavailable', async () => {
  const response = await app.request('/api/health', {}, bindings({ prepare: () => ({ first: async () => { throw new Error('private database detail'); } }) }));
  assert.equal(response.status, 503);
  const body = await response.json() as { status: string; requestId: string };
  assert.equal(body.status, 'degraded');
  assert.ok(body.requestId);
  assert.equal(JSON.stringify(body).includes('private database detail'), false);
});
