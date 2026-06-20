import { prisma, Role } from '@aww/database';

export async function getOwnerRecipients(organizationId: string) {
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      isActive: true,
      branchRoles: { some: { role: { in: [Role.OWNER, Role.SUPER_ADMIN] } } },
    },
    select: { email: true, name: true },
  });
  const seen = new Set<string>();
  return users.filter((u) => {
    if (seen.has(u.email)) return false;
    seen.add(u.email);
    return true;
  });
}
