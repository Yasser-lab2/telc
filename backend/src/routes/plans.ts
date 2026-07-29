import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { getDb } from '../db';
import { plans } from '../db/schema';
import type { Env } from '../types';

const app = new Hono<Env>();

app.get('/', async (c) => {
  const rows = await getDb(c.env.DB).select().from(plans).where(eq(plans.isActive, true));
  return c.json({ plans: rows });
});

export default app;
