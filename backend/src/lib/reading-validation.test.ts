import assert from 'node:assert/strict';
import test from 'node:test';
import { sectionPointsMax, validateReadingExamImport } from './reading-validation';

const specifications = [
  ['teil1', 1, 5, 5], ['teil2', 6, 10, 5], ['teil3', 11, 20, 2.5], ['sprach1', 21, 30, 1.5], ['sprach2', 31, 40, 1.5],
] as const;

function completeExam() {
  return {
    exam: { title: 'TELC B1 complet', level: 'B1', durationMinutes: 90, scoreMax: 105, accessStatus: 'premium' },
    sections: specifications.map(([code, start, end, points]) => ({
      code, title: code, instructions: '', mainText: '', exerciseType: 'multiple_choice',
      questions: Array.from({ length: end - start + 1 }, (_, index) => ({ number: start + index, text: `Question ${start + index}`, points, answerType: 'single', options: [{ code: 'a', text: 'A', isCorrect: true }, { code: 'b', text: 'B', isCorrect: false }] })),
    })),
  };
}

test('a complete 105-point exam is publishable', () => {
  const result = validateReadingExamImport(completeExam(), 'publish');
  assert.equal(result.ok, true);
});

test('publishing rejects an incomplete blueprint', () => {
  const exam = completeExam();
  exam.sections.pop();
  const result = validateReadingExamImport(exam, 'publish');
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes('exactly 5 sections')));
});

test('draft validation rejects multiple correct answers', () => {
  const exam = completeExam();
  exam.sections[0].questions[0].options[1].isCorrect = true;
  const result = validateReadingExamImport(exam, 'draft');
  assert.equal(result.ok, false);
});

test('section score is derived from question points', () => {
  assert.equal(sectionPointsMax(completeExam().sections[0]), 25);
});
