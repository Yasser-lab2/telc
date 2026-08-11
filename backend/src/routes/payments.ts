import { and, desc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getDb } from '../db';
import { manualPayments, paymentStatusEvents, plans } from '../db/schema';
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

  const [existing] = await db.select().from(manualPayments).where(and(
    eq(manualPayments.userId, user.id), eq(manualPayments.planId, plan.id), eq(manualPayments.status, 'pending'),
  )).orderBy(desc(manualPayments.createdAt)).limit(1);
  if (existing) return c.json({ paymentId: existing.id, whatsappUrl: buildWhatsAppURL(c.env.WHATSAPP_NUMBER, plan.name, plan.priceMad, existing.id, c.env.CIH_ACCOUNT_NUMBER), reused: true });

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
  await db.insert(paymentStatusEvents).values({ id: nanoid(), paymentId, status: 'created', note: 'Payment request created', actorUserId: user.id, createdAt: now });

  return c.json({
    paymentId,
    whatsappUrl: buildWhatsAppURL(
      c.env.WHATSAPP_NUMBER,
      plan.name,
      plan.priceMad,
      paymentId,
      c.env.CIH_ACCOUNT_NUMBER,
    ), reused: false,
  });
});

app.post('/manual/:id/proof', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = getDb(c.env.DB);
  const [payment] = await db.select().from(manualPayments).where(and(eq(manualPayments.id, c.req.param('id')), eq(manualPayments.userId, user.id))).limit(1);
  if (!payment) return apiError(c, 404, 'Payment not found', 'NOT_FOUND');
  if (payment.status !== 'pending') return apiError(c, 400, 'Only pending payments accept proof', 'BAD_REQUEST');
  const form = await c.req.parseBody();
  const proof = form.proof;
  if (!(proof instanceof File)) return apiError(c, 400, 'Proof file is required', 'BAD_REQUEST');
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowed.includes(proof.type)) return apiError(c, 400, 'Proof must be JPG, PNG, WebP, or PDF', 'BAD_REQUEST');
  if (proof.size <= 0 || proof.size > 5 * 1024 * 1024) return apiError(c, 400, 'Proof must be smaller than 5 MB', 'BAD_REQUEST');
  const extension = proof.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'bin';
  const objectKey = `payments/${user.id}/${payment.id}/${nanoid()}.${extension}`;
  await c.env.PAYMENT_PROOFS.put(objectKey, proof.stream(), { httpMetadata: { contentType: proof.type }, customMetadata: { paymentId: payment.id, userId: user.id } });
  if (payment.proofObjectKey) await c.env.PAYMENT_PROOFS.delete(payment.proofObjectKey);
  const now = new Date();
  await db.update(manualPayments).set({ proofObjectKey: objectKey, proofFileName: proof.name.slice(0, 200), proofMimeType: proof.type }).where(eq(manualPayments.id, payment.id));
  await db.insert(paymentStatusEvents).values({ id: nanoid(), paymentId: payment.id, status: 'proof_uploaded', note: proof.name.slice(0, 200), actorUserId: user.id, createdAt: now });
  return c.json({ ok: true, fileName: proof.name });
});

app.get('/manual/my', authMiddleware, async (c) => {
  const user = c.get('user');
  const rows = await getDb(c.env.DB)
    .select({ payment: manualPayments, plan: plans })
    .from(manualPayments)
    .innerJoin(plans, eq(manualPayments.planId, plans.id))
    .where(eq(manualPayments.userId, user.id))
    .orderBy(desc(manualPayments.createdAt));

  const ids = rows.map((row) => row.payment.id);
  const events = ids.length ? await getDb(c.env.DB).select().from(paymentStatusEvents).where(inArray(paymentStatusEvents.paymentId, ids)).orderBy(desc(paymentStatusEvents.createdAt)) : [];
  return c.json({ payments: rows.map((row) => ({ ...row.payment, hasProof: Boolean(row.payment.proofObjectKey), plan: row.plan, events: events.filter((event) => event.paymentId === row.payment.id) })) });
});

export default app;
