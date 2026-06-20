'use server';

import { prisma } from '@aww/database';
import { requireAuth } from '@/lib/session';

export async function markNotificationsRead(ids?: string[]) {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      readAt: null,
      ...(ids && ids.length ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
  return { ok: true };
}
