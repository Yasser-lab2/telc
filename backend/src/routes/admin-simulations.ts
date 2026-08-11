import { asc, count, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { adminAuditLogs, contentItems, simulationBlueprints, simulationModules, simulationSessions } from '../db/schema';
import { apiError } from '../lib/http';
import { adminMiddleware, requirePermission } from '../middleware/admin';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<Env>();
app.use('*', authMiddleware, adminMiddleware, requirePermission('content.manage'));

const moduleSchema = z.object({ contentItemId: z.string().min(1), durationMinutes: z.number().int().min(1).max(180), weight: z.number().positive().max(10).default(1) });
const blueprintSchema = z.object({ title: z.string().trim().min(3).max(160), level: z.enum(['B1', 'B2']), accessStatus: z.enum(['free', 'premium']), durationMinutes: z.number().int().min(30).max(360), instructions: z.string().max(5000).optional(), modules: z.array(moduleSchema).min(1).max(10) });

app.get('/candidates', async (c) => {
  const items = await getDb(c.env.DB).select({ id: contentItems.id, title: contentItems.title, skill: contentItems.skill, level: contentItems.level, durationMinutes: contentItems.durationMinutes }).from(contentItems).where(eq(contentItems.status, 'published')).orderBy(asc(contentItems.skill), asc(contentItems.title));
  return c.json({ items: items.filter((item) => ['reading', 'listening', 'writing'].includes(item.skill)) });
});

app.get('/', async (c) => c.json({ simulations: await loadBlueprints(c.env.DB) }));

app.post('/', async (c) => {
  const body = blueprintSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid simulation blueprint', 'BAD_REQUEST');
  const validation = await validateModules(c.env.DB, body.data.level, body.data.modules);
  if (validation) return apiError(c, 400, validation, 'BAD_REQUEST');
  const now = new Date(); const id = nanoid(); const actor = c.get('user');
  await getDb(c.env.DB).insert(simulationBlueprints).values({ id, title: body.data.title, level: body.data.level, status: 'draft', accessStatus: body.data.accessStatus, durationMinutes: body.data.durationMinutes, instructions: body.data.instructions, createdBy: actor.id, createdAt: now, updatedAt: now });
  await saveModules(c.env.DB, id, body.data.modules);
  await getDb(c.env.DB).insert(contentItems).values({ id: `simulation:${id}`, slug: `simulation-${id}`, skill: 'simulation', kind: 'simulation', level: body.data.level, title: body.data.title, description: body.data.instructions, status: 'draft', accessStatus: body.data.accessStatus, difficulty: 'advanced', durationMinutes: body.data.durationMinutes, metadataJson: JSON.stringify({ simulationId: id }), createdBy: actor.id, createdAt: now, updatedAt: now });
  await audit(c.env.DB, actor.id, 'simulation.created', id, { title: body.data.title, modules: body.data.modules.length });
  return c.json({ simulation: (await loadBlueprints(c.env.DB, id))[0] }, 201);
});

app.put('/:id', async (c) => {
  const body = blueprintSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid simulation blueprint', 'BAD_REQUEST');
  const db = getDb(c.env.DB); const id = c.req.param('id');
  const [existing] = await db.select().from(simulationBlueprints).where(eq(simulationBlueprints.id, id)).limit(1);
  if (!existing) return apiError(c, 404, 'Simulation not found', 'NOT_FOUND');
  const [usage] = await db.select({ value: count() }).from(simulationSessions).where(eq(simulationSessions.simulationId, id));
  if (usage.value) return apiError(c, 400, 'A simulation with learner sessions cannot be rewritten; archive it and create a new version', 'BAD_REQUEST');
  const validation = await validateModules(c.env.DB, body.data.level, body.data.modules);
  if (validation) return apiError(c, 400, validation, 'BAD_REQUEST');
  const now = new Date();
  await db.update(simulationBlueprints).set({ title: body.data.title, level: body.data.level, accessStatus: body.data.accessStatus, durationMinutes: body.data.durationMinutes, instructions: body.data.instructions, updatedAt: now }).where(eq(simulationBlueprints.id, id));
  await db.delete(simulationModules).where(eq(simulationModules.simulationId, id));
  await saveModules(c.env.DB, id, body.data.modules);
  await db.update(contentItems).set({ title: body.data.title, level: body.data.level, accessStatus: body.data.accessStatus, durationMinutes: body.data.durationMinutes, description: body.data.instructions, updatedAt: now }).where(eq(contentItems.id, `simulation:${id}`));
  await audit(c.env.DB, c.get('user').id, 'simulation.updated', id, { modules: body.data.modules.length });
  return c.json({ simulation: (await loadBlueprints(c.env.DB, id))[0] });
});

app.post('/:id/publish', async (c) => {
  const id = c.req.param('id'); const rows = await loadBlueprints(c.env.DB, id); const simulation = rows[0];
  if (!simulation) return apiError(c, 404, 'Simulation not found', 'NOT_FOUND');
  const skills = new Set(simulation.modules.map((module) => module.skill));
  if (!(['reading', 'listening', 'writing'] as const).every((skill) => skills.has(skill))) return apiError(c, 400, 'Published simulation requires reading, listening and writing modules', 'BAD_REQUEST');
  const now = new Date(); const db = getDb(c.env.DB);
  await db.update(simulationBlueprints).set({ status: 'published', publishedAt: now, updatedAt: now }).where(eq(simulationBlueprints.id, id));
  await db.update(contentItems).set({ status: 'published', publishedAt: now, updatedAt: now }).where(eq(contentItems.id, `simulation:${id}`));
  await audit(c.env.DB, c.get('user').id, 'simulation.published', id, {});
  return c.json({ ok: true });
});

app.post('/:id/archive', async (c) => {
  const id = c.req.param('id'); const now = new Date(); const db = getDb(c.env.DB);
  await db.update(simulationBlueprints).set({ status: 'archived', updatedAt: now }).where(eq(simulationBlueprints.id, id));
  await db.update(contentItems).set({ status: 'archived', updatedAt: now }).where(eq(contentItems.id, `simulation:${id}`));
  await audit(c.env.DB, c.get('user').id, 'simulation.archived', id, {});
  return c.json({ ok: true });
});

async function validateModules(dbBinding: D1Database, level: 'B1' | 'B2', modules: Array<z.infer<typeof moduleSchema>>) {
  const ids = modules.map((module) => module.contentItemId);
  if (new Set(ids).size !== ids.length) return 'A content item can only appear once';
  const items = await getDb(dbBinding).select().from(contentItems).where(inArray(contentItems.id, ids));
  if (items.length !== ids.length) return 'One or more content items do not exist';
  if (items.some((item) => item.status !== 'published' || item.level !== level || !['reading', 'listening', 'writing'].includes(item.skill))) return 'Modules must use published content from the same level';
  return null;
}

async function saveModules(dbBinding: D1Database, simulationId: string, modules: Array<z.infer<typeof moduleSchema>>) {
  const db = getDb(dbBinding); const items = await db.select().from(contentItems).where(inArray(contentItems.id, modules.map((module) => module.contentItemId))); const byId = new Map(items.map((item) => [item.id, item]));
  await db.insert(simulationModules).values(modules.map((module, orderIndex) => ({ id: nanoid(), simulationId, contentItemId: module.contentItemId, skill: byId.get(module.contentItemId)!.skill as 'reading' | 'listening' | 'writing', orderIndex, durationMinutes: module.durationMinutes, weight: module.weight })));
}

async function loadBlueprints(dbBinding: D1Database, id?: string) {
  const db = getDb(dbBinding); const simulations = await db.select().from(simulationBlueprints).where(id ? eq(simulationBlueprints.id, id) : undefined).orderBy(asc(simulationBlueprints.createdAt));
  if (!simulations.length) return [];
  const modules = await db.select({ module: simulationModules, content: { title: contentItems.title, status: contentItems.status } }).from(simulationModules).innerJoin(contentItems, eq(simulationModules.contentItemId, contentItems.id)).where(inArray(simulationModules.simulationId, simulations.map((item) => item.id))).orderBy(asc(simulationModules.orderIndex));
  return simulations.map((simulation) => ({ ...simulation, modules: modules.filter((row) => row.module.simulationId === simulation.id).map((row) => ({ ...row.module, title: row.content.title, contentStatus: row.content.status })) }));
}

async function audit(dbBinding: D1Database, actorUserId: string, action: string, targetId: string, metadata: unknown) { await getDb(dbBinding).insert(adminAuditLogs).values({ id: nanoid(), actorUserId, action, targetType: 'simulation', targetId, metadataJson: JSON.stringify(metadata), createdAt: new Date() }); }

export default app;
