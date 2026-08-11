import { asc, and, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db';
import { contentItemMedia, contentItems, contentOptions, contentQuestions, contentSections, mediaAssets } from '../db/schema';

export type LearningSkill = 'reading' | 'listening' | 'writing' | 'speaking' | 'simulation';

export async function listPublishedContent(dbBinding: D1Database, skill?: LearningSkill) {
  const db = getDb(dbBinding);
  return db
    .select()
    .from(contentItems)
    .where(skill ? and(eq(contentItems.status, 'published'), eq(contentItems.skill, skill)) : eq(contentItems.status, 'published'))
    .orderBy(asc(contentItems.createdAt));
}

export async function loadPublishedContent(dbBinding: D1Database, idOrSlug: string) {
  return loadContentDetail(dbBinding, idOrSlug, true);
}

export async function loadContentDetail(dbBinding: D1Database, idOrSlug: string, publishedOnly = false) {
  const db = getDb(dbBinding);
  const idCondition = publishedOnly ? and(eq(contentItems.status, 'published'), eq(contentItems.id, idOrSlug)) : eq(contentItems.id, idOrSlug);
  const slugCondition = publishedOnly ? and(eq(contentItems.status, 'published'), eq(contentItems.slug, idOrSlug)) : eq(contentItems.slug, idOrSlug);
  const [item] = await db
    .select()
    .from(contentItems)
    .where(idCondition)
    .limit(1);
  const resolvedItem = item ?? (await db
    .select()
    .from(contentItems)
    .where(slugCondition)
    .limit(1))[0];
  if (!resolvedItem) return null;

  const sections = await db.select().from(contentSections).where(eq(contentSections.contentItemId, resolvedItem.id)).orderBy(asc(contentSections.orderIndex));
  const questions = sections.length
    ? await db.select().from(contentQuestions).where(inArray(contentQuestions.sectionId, sections.map((section) => section.id))).orderBy(asc(contentQuestions.orderIndex))
    : [];
  const options = questions.length
    ? await db.select().from(contentOptions).where(inArray(contentOptions.questionId, questions.map((question) => question.id))).orderBy(asc(contentOptions.orderIndex))
    : [];
  const media = await db
    .select({ attachment: contentItemMedia, asset: mediaAssets })
    .from(contentItemMedia)
    .innerJoin(mediaAssets, eq(contentItemMedia.mediaAssetId, mediaAssets.id))
    .where(eq(contentItemMedia.contentItemId, resolvedItem.id))
    .orderBy(asc(contentItemMedia.orderIndex));

  return {
    ...resolvedItem,
    tags: parseJson(resolvedItem.tagsJson),
    metadata: parseJson(resolvedItem.metadataJson),
    sections: sections.map((section) => ({
      ...section,
      settings: parseJson(section.settingsJson),
      questions: questions.filter((question) => question.sectionId === section.id).map((question) => ({
        ...question,
        settings: parseJson(question.settingsJson),
        options: options.filter((option) => option.questionId === question.id),
      })),
    })),
    media: media.map(({ attachment, asset }) => ({ ...attachment, asset })),
  };
}

function parseJson(value: string | null) {
  if (!value) return null;
  try { return JSON.parse(value) as unknown; } catch { return null; }
}
