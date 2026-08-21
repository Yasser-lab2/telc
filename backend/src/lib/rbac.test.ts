import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPermission, permissionsForRole } from './rbac';

test('students have no administration permissions', () => {
  assert.deepEqual(permissionsForRole('student'), []);
  assert.equal(hasPermission('student', 'admin.access'), false);
});

test('support can review payments but cannot manage content or roles', () => {
  assert.equal(hasPermission('support', 'payments.review'), true);
  assert.equal(hasPermission('support', 'subscriptions.manage'), true);
  assert.equal(hasPermission('support', 'content.manage'), false);
  assert.equal(hasPermission('support', 'users.roles'), false);
});

test('content editors are isolated from customer and payment data', () => {
  assert.equal(hasPermission('content_editor', 'content.manage'), true);
  assert.equal(hasPermission('content_editor', 'speaking.review'), true);
  assert.equal(hasPermission('content_editor', 'users.view'), false);
  assert.equal(hasPermission('content_editor', 'payments.review'), false);
});

test('administrators have every declared permission and unknown roles have none', () => {
  assert.equal(permissionsForRole('admin').length, 9);
  assert.equal(hasPermission('admin', 'users.roles'), true);
  assert.deepEqual(permissionsForRole('unexpected'), []);
});
