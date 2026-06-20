import { prisma } from '@aww/database';
import { Role } from '@aww/database';
import {
  type DiscussionAudienceScope,
  isRoleInDiscussionScope,
} from '@/lib/discussion';

const STAFF_ROLES = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WORKER'];
const SUPPORT_STAFF_ROLES = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'CASHIER'];

export interface AccessUser {
  id: string;
  role: string;
  organizationId: string;
  branchId?: string;
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
    if (!STAFF_ROLES.includes(user.role)) return null;

    const scope = (convo.audienceScope ?? 'ALL') as DiscussionAudienceScope;
    if (!isRoleInDiscussionScope(user.role as Role, scope)) return null;

    const isOwnerLike = user.role === 'OWNER' || user.role === 'SUPER_ADMIN';
    if (!isOwnerLike && convo.branchId && user.branchId && convo.branchId !== user.branchId) {
      return null;
    }
    return convo;
  }

  // CUSTOMER_SUPPORT
  if (user.role === 'CUSTOMER') {
    return convo.customer?.userId === user.id ? convo : null;
  }
  return SUPPORT_STAFF_ROLES.includes(user.role) ? convo : null;
}

export { STAFF_ROLES, SUPPORT_STAFF_ROLES };
