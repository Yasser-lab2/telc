import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { contentItems, type ReadingExam } from '../db/schema';

export function readingCatalogId(examId: string) {
  return `legacy-reading:${examId}`;
}

export async function ensureReadingCatalogItem(dbBinding: D1Database, exam: ReadingExam) {
  const db = getDb(dbBinding);
  const now = new Date();
  const id = readingCatalogId(exam.id);
  const values = {
    id,
    slug: `reading-${exam.id}`,
    skill: 'reading' as const,
    kind: 'exam' as const,
    level: exam.level,
    title: exam.title,
    status: exam.status,
    accessStatus: exam.accessStatus,
    difficulty: 'standard' as const,
    durationMinutes: exam.durationMinutes,
    scoreMax: exam.scoreMax,
    metadataJson: JSON.stringify({ legacyReadingExamId: exam.id }),
    publishedAt: exam.status === 'published' ? (exam.updatedAt ?? now) : null,
    createdAt: exam.createdAt ?? now,
    updatedAt: exam.updatedAt ?? now,
  };
  await db.insert(contentItems).values(values).onConflictDoUpdate({
    target: contentItems.id,
    set: {
      level: values.level, title: values.title, status: values.status, accessStatus: values.accessStatus,
      durationMinutes: values.durationMinutes, scoreMax: values.scoreMax, metadataJson: values.metadataJson,
      publishedAt: values.publishedAt, updatedAt: values.updatedAt,
    },
  });
  return id;
}

export async function archiveReadingCatalogItem(dbBinding: D1Database, examId: string) {
  await getDb(dbBinding).update(contentItems).set({ status: 'archived', updatedAt: new Date() }).where(eq(contentItems.id, readingCatalogId(examId)));
}
