import { z } from 'zod';

export const sectionCodes = ['teil1', 'teil2', 'teil3', 'sprach1', 'sprach2'] as const;
export type SectionCode = (typeof sectionCodes)[number];

const ranges: Record<SectionCode, { start: number; end: number; points: number; total: number }> = {
  teil1: { start: 1, end: 5, points: 5, total: 25 },
  teil2: { start: 6, end: 10, points: 5, total: 25 },
  teil3: { start: 11, end: 20, points: 2.5, total: 25 },
  sprach1: { start: 21, end: 30, points: 1.5, total: 15 },
  sprach2: { start: 31, end: 40, points: 1.5, total: 15 },
};

export const examImportSchema = z.object({
  exam: z.object({
    title: z.string().min(1),
    level: z.enum(['B1', 'B2']).default('B1'),
    durationMinutes: z.number().int().positive().default(90),
    scoreMax: z.number().positive().default(105),
    accessStatus: z.enum(['free', 'premium']).default('premium'),
    status: z.enum(['draft', 'published']).optional(),
  }),
  sections: z
    .array(
      z.object({
        code: z.enum(sectionCodes),
        title: z.string().min(1),
        instructions: z.string().optional().default(''),
        mainText: z.string().optional().default(''),
        exerciseType: z.string().min(1),
        extraData: z.unknown().optional(),
        questions: z.array(
          z.object({
            number: z.number().int(),
            text: z.string().min(1),
            points: z.number().positive(),
            answerType: z.string().min(1),
            options: z.array(
              z.object({
                code: z.string().min(1),
                text: z.string().min(1),
                isCorrect: z.boolean().default(false),
                explanation: z.string().optional(),
              }),
            ),
          }),
        ),
      }),
    )
    .default([]),
});

export type ReadingExamImport = z.infer<typeof examImportSchema>;

export function validateReadingExamImport(input: unknown, mode: 'draft' | 'publish') {
  const parsed = examImportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) };
  }

  const errors = mode === 'publish' ? validateCompleteExam(parsed.data) : validateDraftExam(parsed.data);
  if (errors.length > 0) return { ok: false as const, errors };
  return { ok: true as const, data: parsed.data };
}

function validateDraftExam(input: ReadingExamImport) {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const section of input.sections) {
    if (seen.has(section.code)) errors.push(`Section duplicate: ${section.code}`);
    seen.add(section.code);
    for (const question of section.questions) {
      const correctCount = question.options.filter((option) => option.isCorrect).length;
      if (question.options.length > 0 && correctCount !== 1) {
        errors.push(`Question ${question.number} must have exactly one correct option when options are provided`);
      }
    }
  }
  return errors;
}

function validateCompleteExam(input: ReadingExamImport) {
  const errors: string[] = [];
  const sectionsByCode = new Map(input.sections.map((section) => [section.code, section]));

  if (sectionsByCode.size !== 5 || sectionCodes.some((code) => !sectionsByCode.has(code))) {
    errors.push('Published exam must contain exactly 5 sections: teil1, teil2, teil3, sprach1, sprach2');
  }

  let total = 0;
  for (const code of sectionCodes) {
    const section = sectionsByCode.get(code);
    const range = ranges[code];
    if (!section) continue;

    const expectedNumbers = Array.from({ length: range.end - range.start + 1 }, (_, index) => range.start + index);
    const actualNumbers = section.questions.map((question) => question.number).sort((a, b) => a - b);
    if (actualNumbers.join(',') !== expectedNumbers.join(',')) {
      errors.push(`${code} questions must be ${range.start}-${range.end}`);
    }

    for (const question of section.questions) {
      if (question.points !== range.points) errors.push(`Question ${question.number} must be ${range.points} points`);
      if (question.options.filter((option) => option.isCorrect).length !== 1) {
        errors.push(`Question ${question.number} must have exactly one correct option`);
      }
      total += question.points;
    }
  }

  if (total !== 105 || input.exam.scoreMax !== 105) {
    errors.push('Published exam total score must equal 105');
  }

  return errors;
}

export function sectionPointsMax(section: ReadingExamImport['sections'][number]) {
  return section.questions.reduce((total, question) => total + question.points, 0);
}
