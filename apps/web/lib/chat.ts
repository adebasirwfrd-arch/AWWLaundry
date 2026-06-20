import { prisma } from '@aww/database';

const STAFF_ROLES = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WORKER'];
const SUPPORT_STAFF_ROLES = ['OWNER', 'SUPER_ADMIN', 'MANAGER', 'CASHIER'];

export interface AccessUser {
  id: string;
  role: string;
  organizationId: string;
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
    return STAFF_ROLES.includes(user.role) ? convo : null;
  }

  // CUSTOMER_SUPPORT
  if (user.role === 'CUSTOMER') {
    return convo.customer?.userId === user.id ? convo : null;
  }
  return SUPPORT_STAFF_ROLES.includes(user.role) ? convo : null;
}

export { STAFF_ROLES, SUPPORT_STAFF_ROLES };
