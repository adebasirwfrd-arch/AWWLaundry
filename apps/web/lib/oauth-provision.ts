import { prisma, Role } from '@aww/database';
import { pickPrimaryBranchRole } from './session-user';

interface GoogleProfile {
  email: string;
  name: string;
  image?: string | null;
  googleId: string;
}

const STAFF_OR_ADMIN_ROLES = new Set<Role>([
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.MANAGER,
  Role.CASHIER,
  Role.WORKER,
]);

/** Pastikan user Google punya role cabang + profil pelanggan jika perlu. */
export async function provisionGoogleUser(profile: GoogleProfile) {
  const org = await prisma.organization.findFirst({
    where: { slug: 'aww-laundry' },
  });
  if (!org) throw new Error('Organisasi tidak ditemukan. Jalankan db:seed.');

  const branch = await prisma.branch.findFirst({
    where: { organizationId: org.id, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan. Jalankan db:seed.');

  const email = profile.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email },
    include: { branchRoles: { include: { branch: true } }, customer: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email,
        name: profile.name,
        avatarUrl: profile.image ?? undefined,
        googleId: profile.googleId,
        authProvider: 'GOOGLE',
        emailVerified: true,
        profileCompleted: false,
      },
      include: { branchRoles: { include: { branch: true } }, customer: true },
    });

    await prisma.userBranchRole.create({
      data: { userId: user.id, branchId: branch.id, role: Role.CUSTOMER },
    });

    await prisma.customer.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        name: profile.name,
        phone: `USR-${user.id.slice(-8)}`,
        email,
      },
    });
    return user;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      googleId: user.googleId ?? profile.googleId,
      avatarUrl: profile.image ?? user.avatarUrl,
      emailVerified: true,
      lastLoginAt: new Date(),
      authProvider: user.authProvider === 'EMAIL' ? 'EMAIL' : 'GOOGLE',
    },
  });

  const refreshed = await prisma.user.findUnique({
    where: { id: user.id },
    include: { branchRoles: { include: { branch: true } }, customer: true },
  });
  if (!refreshed) return user;

  const primaryRole = pickPrimaryBranchRole(refreshed.branchRoles);
  const isStaffOrAdmin =
    primaryRole != null && STAFF_OR_ADMIN_ROLES.has(primaryRole.role);

  if (refreshed.branchRoles.length === 0) {
    await prisma.userBranchRole.create({
      data: { userId: refreshed.id, branchId: branch.id, role: Role.CUSTOMER },
    });
  }

  if (!isStaffOrAdmin) {
    const hasCustomerRole = refreshed.branchRoles.some((r) => r.role === Role.CUSTOMER);
    if (!hasCustomerRole) {
      await prisma.userBranchRole.create({
        data: { userId: refreshed.id, branchId: branch.id, role: Role.CUSTOMER },
      });
    }

    if (!refreshed.customer) {
      await prisma.customer.create({
        data: {
          organizationId: org.id,
          userId: refreshed.id,
          name: refreshed.name,
          phone: refreshed.phone ?? `USR-${refreshed.id.slice(-8)}`,
          email: refreshed.email,
        },
      });
    }
  }

  return refreshed;
}
