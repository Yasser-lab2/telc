import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
import { accountTokens, rateLimits } from '../db/schema';

export type AccountTokenType = 'email_verification' | 'password_reset';

export async function createAccountToken(dbBinding: D1Database, userId: string, type: AccountTokenType, lifetimeMinutes: number) {
  const db = getDb(dbBinding);
  const now = new Date();
  await db.update(accountTokens).set({ usedAt: now }).where(and(eq(accountTokens.userId, userId), eq(accountTokens.type, type)));
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  await db.insert(accountTokens).values({ id: nanoid(), userId, type, tokenHash: await hashValue(token), expiresAt: new Date(now.getTime() + lifetimeMinutes * 60_000), createdAt: now });
  return token;
}

export async function consumeAccountToken(dbBinding: D1Database, token: string, type: AccountTokenType) {
  const db = getDb(dbBinding);
  const [row] = await db.select().from(accountTokens).where(and(eq(accountTokens.tokenHash, await hashValue(token)), eq(accountTokens.type, type))).limit(1);
  const now = new Date();
  if (!row || row.usedAt || row.expiresAt <= now) return null;
  await db.update(accountTokens).set({ usedAt: now }).where(and(eq(accountTokens.id, row.id), eq(accountTokens.tokenHash, row.tokenHash)));
  return row;
}

export async function checkRateLimit(dbBinding: D1Database, key: string, maximum: number, windowSeconds: number) {
  const db = getDb(dbBinding);
  const now = new Date();
  const [current] = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  if (!current || current.windowExpiresAt <= now) {
    await db.insert(rateLimits).values({ key, count: 1, windowExpiresAt: new Date(now.getTime() + windowSeconds * 1000), updatedAt: now }).onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, windowExpiresAt: new Date(now.getTime() + windowSeconds * 1000), updatedAt: now } });
    return true;
  }
  if (current.count >= maximum) return false;
  await db.update(rateLimits).set({ count: current.count + 1, updatedAt: now }).where(eq(rateLimits.key, key));
  return true;
}

export async function sendAccountEmail(env: { APP_URL: string; RESEND_API_KEY?: string; EMAIL_FROM?: string }, input: { to: string; subject: string; path: string; action: string }) {
  const url = `${env.APP_URL}${input.path}`;
  if (env.APP_URL.includes('localhost')) return { delivered: false, devUrl: url };
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error('Email delivery is not configured');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.EMAIL_FROM, to: [input.to], subject: input.subject, html: `<p>${input.action}</p><p><a href="${url}">${input.action}</a></p><p>This link expires soon. If you did not request it, ignore this email.</p>` }) });
  if (!response.ok) throw new Error(`Email delivery failed (${response.status})`);
  return { delivered: true, devUrl: null };
}

export async function rateLimitKey(scope: string, identifier: string) {
  return `${scope}:${await hashValue(identifier.toLowerCase())}`;
}

async function hashValue(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
