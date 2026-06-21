import { prisma } from '@aww/database';
import { Role } from '@aww/database';
import {
  type DiscussionAudienceScope,
  isRoleInDiscussionScope,
} from '@/lib/discussion';
import { isDiscussionModeratorRole, isOwnerLikeRole } from '@/lib/api-access-user';
import { hasOrgWideBranchAccess } from '@/lib/branch-access';

const STAFF_ROLES = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WORKER'];
const SUPPORT_STAFF_ROLES = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'CASHIER'];

export interface AccessUser {
  id: string;
  role: string;
  organizationId: string;
  branchId?: string;
}

function normalizeRole(role: string): string {
  return String(role ?? '').toUpperCase();
}

async function userHasBranchAssignment(userId: string, branchId: string): Promise<boolean> {
  const row = await prisma.userBranchRole.findFirst({
    where: { userId, branchId },
    select: { id: true },
  });
  return !!row;
}

async function userHasOwnerAssignment(userId: string, organizationId: string): Promise<boolean> {
  const row = await prisma.userBranchRole.findFirst({
    where: {
      userId,
      role: { in: [Role.OWNER, Role.SUPER_ADMIN] },
      branch: { organizationId },
    },
    select: { id: true },
  });
  return !!row;
}

async function userCanAccessBranch(user: AccessUser, branchId: string | null): Promise<boolean> {
  if (!branchId) return true;
  if (user.branchId && user.branchId === branchId) return true;
  return userHasBranchAssignment(user.id, branchId);
}

async function canAccessStaffDiscussion(
  user: AccessUser,
  convo: {
    organizationId: string;
    branchId: string | null;
    audienceScope: string | null;
  }
): Promise<boolean> {
  const role = normalizeRole(user.role);
  if (!STAFF_ROLES.includes(role)) return false;

  // Owner/super admin (session atau assignment DB) — semua cabang & scope.
  if (isOwnerLikeRole(role) || (await userHasOwnerAssignment(user.id, convo.organizationId))) {
    return true;
  }

  // Manager — semua scope di cabang yang ia kelola.
  if (isDiscussionModeratorRole(role)) {
    return userCanAccessBranch(user, convo.branchId);
  }

  const scope = (convo.audienceScope ?? 'ALL') as DiscussionAudienceScope;
  if (!isRoleInDiscussionScope(role as Role, scope)) return false;

  return userCanAccessBranch(user, convo.branchId);
}

/**
 * Returns the conversation if the user may read/write it, otherwise null.
 */
export async function getAccessibleConversation(user: AccessUser, conversationId: string) {
  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { customer: { select: { userId: true } } },
  });
  if (!convo) return null;
  if (convo.organizationId !== user.organizationId) return null;

  if (convo.type === 'STAFF_DISCUSSION') {
    const allowed = await canAccessStaffDiscussion(user, convo);
    return allowed ? convo : null;
  }

  // CUSTOMER_SUPPORT
  const role = normalizeRole(user.role);
  if (role === 'CUSTOMER') {
    return convo.customer?.userId === user.id ? convo : null;
  }
  if (!SUPPORT_STAFF_ROLES.includes(role)) return null;
  if (hasOrgWideBranchAccess(role)) return convo;
  if (!user.branchId || !convo.customerId) return null;

  const linkedOrder = await prisma.order.findFirst({
    where: { customerId: convo.customerId, branchId: user.branchId },
    select: { id: true },
  });
  return linkedOrder ? convo : null;
}

export { STAFF_ROLES, SUPPORT_STAFF_ROLES, canAccessStaffDiscussion };
