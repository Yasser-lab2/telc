import assert from 'node:assert/strict';
import test from 'node:test';
import { parseGradingResult } from './ai-provider';

const valid = { score_inhalt: 4, score_redemittel: 3, score_korrektheit: 4, score_total: 73.3, niveau_vocab: 'B1', errors: [], suggestions: ['Mehr Konnektoren verwenden.'], improved_text: 'Guten Tag...', feedback_ar: 'Bon travail.' };

test('AI grading accepts a schema-compliant JSON response', () => assert.equal(parseGradingResult(JSON.stringify(valid)).score_total, 73.3));
test('AI grading rejects scores outside the rubric', () => assert.throws(() => parseGradingResult(JSON.stringify({ ...valid, score_inhalt: 9 }))));
test('AI grading extracts JSON without trusting surrounding prose', () => assert.equal(parseGradingResult(`result: ${JSON.stringify(valid)}`).niveau_vocab, 'B1'));
