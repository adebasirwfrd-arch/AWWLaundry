import { prisma, Role } from '@aww/database';

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: JSON.stringify(params.data ?? {}),
    },
  });
}

/**
 * Notify every staff member holding one of the given roles at a branch.
 */
export async function notifyBranchRoles(params: {
  branchId: string;
  roles: Role[];
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  excludeUserId?: string;
}) {
  const recipients = await prisma.userBranchRole.findMany({
    where: { branchId: params.branchId, role: { in: params.roles } },
    select: { userId: true },
  });

  const ids = [...new Set(recipients.map((r) => r.userId))].filter(
    (id) => id !== params.excludeUserId
  );
  if (ids.length === 0) return;

  await prisma.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: JSON.stringify(params.data ?? {}),
    })),
  });
}
