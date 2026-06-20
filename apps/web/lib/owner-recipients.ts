import { prisma, Role } from '@aww/database';
import { getOwnerNotificationEmail } from '@/lib/env';

/** Email owner untuk semua notifikasi laporan & alert — hardcoded fallback. */
const HARDCODED_OWNER_EMAIL = 'ade.basirwfrd@gmail.com';

export function getHardcodedOwnerEmail() {
  return getOwnerNotificationEmail() || HARDCODED_OWNER_EMAIL;
}

export async function getOwnerRecipients(organizationId: string) {
  const ownerEmail = getHardcodedOwnerEmail();

  const dbOwner = await prisma.user.findFirst({
    where: {
      organizationId,
      isActive: true,
      branchRoles: { some: { role: { in: [Role.OWNER, Role.SUPER_ADMIN] } } },
    },
    select: { name: true },
    orderBy: { createdAt: 'asc' },
  });

  return [{ email: ownerEmail, name: dbOwner?.name ?? 'Owner AWW Laundry' }];
}
