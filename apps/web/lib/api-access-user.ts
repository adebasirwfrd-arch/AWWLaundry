import type { Session } from 'next-auth';
import { Role } from '@aww/database';
import { loadSessionUserById } from '@/lib/session-user';
import type { AccessUser } from '@/lib/chat';

function normalizeRole(role: unknown): string {
  return String(role ?? '').toUpperCase();
}

/** Pastikan API route punya role/org/branch lengkap — fallback ke DB jika JWT belum terisi. */
export async function resolveApiAccessUser(
  session: Session & { user: NonNullable<Session['user']> & { id: string } }
): Promise<AccessUser | null> {
  let id = session.user.id;
  let role = normalizeRole(session.user.role);
  let organizationId = session.user.organizationId;
  let branchId = session.user.branchId;

  if (!organizationId || !role || !branchId) {
    const fresh = await loadSessionUserById(id);
    if (!fresh) return null;
    id = fresh.id;
    role = normalizeRole(fresh.role);
    organizationId = fresh.organizationId;
    branchId = fresh.branchId;
  }

  return { id, role, organizationId, branchId };
}

export function isOwnerLikeRole(role: string): boolean {
  const r = normalizeRole(role);
  return r === Role.OWNER || r === Role.SUPER_ADMIN;
}

export function isDiscussionModeratorRole(role: string): boolean {
  const r = normalizeRole(role);
  return r === Role.OWNER || r === Role.SUPER_ADMIN || r === Role.MANAGER;
}
