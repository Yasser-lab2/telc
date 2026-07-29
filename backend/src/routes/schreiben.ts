import { Hono } from 'hono';
import { schreibenTypes } from '../data/exercises';
import { apiError } from '../lib/http';
import { authMiddleware } from '../middleware/auth';
import { subscriptionMiddleware } from '../middleware/subscription';
import type { Env } from '../types';

const app = new Hono<Env>();

app.use('*', authMiddleware, subscriptionMiddleware);

app.get('/', (c) => c.json({ types: schreibenTypes }));

app.get('/:typeId', (c) => {
  const type = schreibenTypes.find((item) => item.id === c.req.param('typeId'));
  if (!type) return apiError(c, 404, 'Schreiben type not found', 'NOT_FOUND');
  return c.json({ type });
});

export default app;
