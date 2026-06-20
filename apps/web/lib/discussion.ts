import { Role } from '@aww/database';

export type DiscussionAudienceScope = 'ALL' | 'ADMIN' | 'WORKER';

export const DISCUSSION_SCOPE_LABELS: Record<DiscussionAudienceScope, string> = {
  ALL: 'Semua',
  ADMIN: 'Admin',
  WORKER: 'Pekerja',
};

const ADMIN_ROLES: Role[] = [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER];
const ALL_STAFF_ROLES: Role[] = [...ADMIN_ROLES, Role.WORKER];

export function rolesForDiscussionScope(scope: DiscussionAudienceScope): Role[] {
  if (scope === 'WORKER') return [Role.WORKER];
  if (scope === 'ADMIN') return ADMIN_ROLES;
  return ALL_STAFF_ROLES;
}

export function isRoleInDiscussionScope(role: Role, scope: DiscussionAudienceScope): boolean {
  return rolesForDiscussionScope(scope).includes(role);
}

export function discussionTitle(branchName: string, scope: DiscussionAudienceScope): string {
  return `Diskusi Tim — ${branchName} · ${DISCUSSION_SCOPE_LABELS[scope]}`;
}
