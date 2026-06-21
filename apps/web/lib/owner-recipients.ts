import { prisma, Role } from '@aww/database';

/** Email penerima laporan cashflow & notifikasi owner — selalu hardcoded. */
export const CASHFLOW_REPORT_RECIPIENT = 'ade.basirwfrd@gmail.com';

export function getHardcodedOwnerEmail() {
  return CASHFLOW_REPORT_RECIPIENT;
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
