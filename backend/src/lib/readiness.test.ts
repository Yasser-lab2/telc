import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateReadiness } from './readiness';

test('readiness stays unavailable without real evidence', () => {
  assert.equal(calculateReadiness([]).score, null);
});

test('readiness is preliminary when only practice exists', () => {
  const result = calculateReadiness([{ skill: 'reading', completedAttempts: 2, averagePercentage: 70 }]);
  assert.equal(result.score, 70);
  assert.equal(result.confidence, 'preliminary');
});

test('reliable readiness gives equal weight to simulation and core practice', () => {
  const result = calculateReadiness([
    { skill: 'reading', completedAttempts: 2, averagePercentage: 60 },
    { skill: 'listening', completedAttempts: 1, averagePercentage: 70 },
    { skill: 'writing', completedAttempts: 1, averagePercentage: 80 },
    { skill: 'simulation', completedAttempts: 1, averagePercentage: 80 },
  ]);
  assert.equal(result.score, 75);
  assert.equal(result.confidence, 'reliable');
});
