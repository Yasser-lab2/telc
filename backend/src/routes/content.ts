import { Hono } from 'hono';
import { z } from 'zod';
import { apiError } from '../lib/http';
import { listPublishedContent, loadPublishedContent } from '../lib/content';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();
app.use('*', authMiddleware, subscriptionMiddleware);

const skillSchema = z.enum(['reading', 'listening', 'writing', 'speaking', 'simulation']);

app.get('/', async (c) => {
  const parsed = skillSchema.optional().safeParse(c.req.query('skill'));
  if (!parsed.success) return apiError(c, 400, 'Invalid skill', 'BAD_REQUEST');
  const items = await listPublishedContent(c.env.DB, parsed.data);
  return c.json({ items });
});

app.get('/:id', async (c) => {
  const item = await loadPublishedContent(c.env.DB, c.req.param('id'));
  if (!item) return apiError(c, 404, 'Content not found', 'NOT_FOUND');
  return c.json({
    item: {
      ...item,
      sections: item.sections.map((section) => ({
        ...section,
        body: item.skill === 'listening' ? null : section.body,
        questions: section.questions.map((question) => ({
          ...question,
          explanation: null,
          options: question.options.map(({ isCorrect: _isCorrect, explanation: _explanation, ...option }) => option),
        })),
      })),
    },
  });
});

export default app;
