import type { MiddlewareHandler } from 'hono';
import { apiError } from '../lib/http';
import { hasPermission, type Permission } from '../lib/rbac';
import type { Env } from '../types';

export function requirePermission(permission: Permission): MiddlewareHandler<Env> {
  return async (c, next) => {
    if (!hasPermission(c.get('user').role, permission)) return apiError(c, 403, 'Insufficient permission', 'FORBIDDEN');
    await next();
  };
}

export const adminMiddleware = requirePermission('admin.access');
