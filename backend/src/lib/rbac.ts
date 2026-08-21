export type AppRole = 'student' | 'support' | 'content_editor' | 'admin';
export type Permission = 'admin.access' | 'analytics.view' | 'payments.review' | 'users.view' | 'users.manage' | 'users.roles' | 'subscriptions.manage' | 'content.manage' | 'speaking.review';

const rolePermissions: Record<AppRole, Permission[]> = {
  student: [],
  support: ['admin.access', 'analytics.view', 'payments.review', 'users.view', 'subscriptions.manage'],
  content_editor: ['admin.access', 'content.manage', 'speaking.review'],
  admin: ['admin.access', 'analytics.view', 'payments.review', 'users.view', 'users.manage', 'users.roles', 'subscriptions.manage', 'content.manage', 'speaking.review'],
};

export function permissionsForRole(role: string | null | undefined): Permission[] {
  return rolePermissions[role as AppRole] ?? [];
}

export function hasPermission(role: string | null | undefined, permission: Permission) {
  return permissionsForRole(role).includes(permission);
}
