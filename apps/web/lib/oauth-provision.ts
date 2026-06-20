import { prisma, Role } from '@aww/database';

interface GoogleProfile {
  email: string;
  name: string;
  image?: string | null;
  googleId: string;
}

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

  let user = await prisma.user.findUnique({ where: { email: profile.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.image ?? undefined,
        googleId: profile.googleId,
        authProvider: 'GOOGLE',
        emailVerified: true,
        profileCompleted: false,
      },
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
        email: profile.email,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId ?? profile.googleId,
        avatarUrl: profile.image ?? user.avatarUrl,
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    });

    const role = await prisma.userBranchRole.findFirst({ where: { userId: user.id } });
    if (!role) {
      await prisma.userBranchRole.create({
        data: { userId: user.id, branchId: branch.id, role: Role.CUSTOMER },
      });
    }

    const customer = await prisma.customer.findUnique({ where: { userId: user.id } });
    if (!customer) {
      await prisma.customer.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          name: user.name,
          phone: user.phone ?? `USR-${user.id.slice(-8)}`,
          email: user.email,
        },
      });
    }
  }

  return user;
}
