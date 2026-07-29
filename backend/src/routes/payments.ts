import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { manualPayments, plans } from '../db/schema';
import { apiError } from '../lib/http';
import { buildWhatsAppURL } from '../lib/whatsapp';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<Env>();

const createSchema = z.object({
  planId: z.string().min(1),
});

app.post('/manual/create', authMiddleware, async (c) => {
  const body = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!body.success) return apiError(c, 400, 'Invalid payment payload', 'BAD_REQUEST');

  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [plan] = await db.select().from(plans).where(eq(plans.id, body.data.planId)).limit(1);
  if (!plan || !plan.isActive) return apiError(c, 404, 'Plan not found', 'NOT_FOUND');
  if (plan.id === 'trial') return apiError(c, 400, 'Trial does not require manual payment', 'BAD_REQUEST');

  const paymentId = nanoid();
  const now = new Date();
  await db.insert(manualPayments).values({
    id: paymentId,
    userId: user.id,
    planId: plan.id,
    amountMad: plan.priceMad,
    status: 'pending',
    whatsappSentAt: now,
    createdAt: now,
  });

  return c.json({
    paymentId,
    whatsappUrl: buildWhatsAppURL(
      c.env.WHATSAPP_NUMBER,
      plan.name,
      plan.priceMad,
      paymentId,
      c.env.CIH_ACCOUNT_NUMBER,
    ),
  });
});

app.get('/manual/my', authMiddleware, async (c) => {
  const user = c.get('user');
  const rows = await getDb(c.env.DB)
    .select({ payment: manualPayments, plan: plans })
    .from(manualPayments)
    .innerJoin(plans, eq(manualPayments.planId, plans.id))
    .where(eq(manualPayments.userId, user.id))
    .orderBy(desc(manualPayments.createdAt));

  return c.json({
    payments: rows.map((row) => ({ ...row.payment, plan: row.plan })),
  });
});

export default app;
