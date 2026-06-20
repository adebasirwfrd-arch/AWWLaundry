'use server';

import '@/lib/load-root-env';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma, Role } from '@aww/database';
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/brevo';
import { getAppUrl, isGoogleAuthConfigured } from '@/lib/env';

async function getDefaultOrgBranch() {
  const org = await prisma.organization.findFirst({ where: { slug: 'aww-laundry' } });
  if (!org) throw new Error('Organisasi belum disetup. Hubungi admin.');
  const branch = await prisma.branch.findFirst({
    where: { organizationId: org.id, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!branch) throw new Error('Cabang belum disetup. Hubungi admin.');
  return { org, branch };
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  password: string;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (name.length < 2) throw new Error('Nama minimal 2 karakter');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Format email tidak valid');
  if (password.length < 8) throw new Error('Password minimal 8 karakter');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('Email sudah terdaftar. Silakan masuk.');

  const { org, branch } = await getDefaultOrgBranch();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        organizationId: org.id,
        email,
        name,
        passwordHash,
        authProvider: 'EMAIL',
        emailVerified: false,
        profileCompleted: false,
      },
    });

    await tx.userBranchRole.create({
      data: { userId: user.id, branchId: branch.id, role: Role.CUSTOMER },
    });

    await tx.customer.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        name,
        phone: `USR-${user.id.slice(-8)}`,
        email,
      },
    });
  });

  try {
    await sendWelcomeEmail(email, name);
  } catch (e) {
    console.warn('[Register] Welcome email failed:', e);
  }

  return { ok: true };
}

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error('Email wajib diisi');

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  // Always return ok to prevent email enumeration
  if (!user?.passwordHash) return { ok: true };

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
  await prisma.verificationToken.create({
    data: { identifier: normalized, token, expires },
  });

  try {
    await sendPasswordResetEmail(normalized, user.name, token);
  } catch (e) {
    console.error('[Forgot password] Email failed:', e);
    throw new Error('Gagal mengirim email reset. Coba lagi nanti.');
  }

  return { ok: true };
}

export async function resetPassword(input: { email: string; token: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (password.length < 8) throw new Error('Password minimal 8 karakter');

  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, token: input.token },
  });

  if (!record || record.expires < new Date()) {
    throw new Error('Link reset tidak valid atau sudah kadaluarsa');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('Akun tidak ditemukan');

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token: record.token } }),
  ]);

  return { ok: true };
}

export async function getAuthPublicConfig() {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'AWW Laundry',
    appUrl: getAppUrl(),
    googleEnabled: isGoogleAuthConfigured(),
  };
}
