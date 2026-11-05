import type { SessionClaims } from './auth';

export type Role = 'superadmin' | 'admin' | 'editor';

const ORDER: Record<Role, number> = { editor: 1, admin: 2, superadmin: 3 };

export function atLeast(session: SessionClaims | null, role: Role): boolean {
  if (!session) return false;
  return ORDER[session.role] >= ORDER[role];
}

export function requireRole(session: SessionClaims | null, role: Role) {
  if (!atLeast(session, role)) {
    const err = new Error('Forbidden') as Error & { status?: number };
    err.status = session ? 403 : 401;
    throw err;
  }
}
