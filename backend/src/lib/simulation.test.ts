import assert from 'node:assert/strict';
import test from 'node:test';
import { weightedSimulationPercentage } from './simulation';

test('simulation score respects module weights', () => {
  assert.equal(weightedSimulationPercentage([{ percentage: 80, weight: 2 }, { percentage: 50, weight: 1 }]), 70);
});

test('simulation score handles an empty result set', () => {
  assert.equal(weightedSimulationPercentage([]), 0);
});
