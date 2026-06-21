'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import { ensureCustomerFallback } from '@/lib/session-user';
import { syncCatalogToServiceTypes, getOrgSettings } from '@/lib/org-settings';
import {
  fetchOwnerDashboardData,
  type OwnerDashboardFilters,
  type PaymentFilter,
} from '@/lib/owner-analytics';
import type { DashboardPeriod } from '@/lib/date-buckets';
import { isBranchManager } from '@/lib/branch-access';

const ADMIN_ROLES = [Role.OWNER, Role.SUPER_ADMIN];
const STAFF_ROLES = [Role.CASHIER, Role.WORKER, Role.MANAGER] as const;

async function adminCtx() {
  const session = await requireAuth(ADMIN_ROLES);
  return {
    organizationId: session.user.organizationId,
    branchId: session.user.branchId,
    userId: session.user.id,
  };
}

export async function getOwnerDashboardMetrics(input: {
  branchId?: string;
  period: DashboardPeriod;
  paymentMethod: PaymentFilter;
}) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
  const branchScoped = isBranchManager(session.user.role);
  return fetchOwnerDashboardData({
    organizationId: session.user.organizationId,
    branchId: branchScoped ? session.user.branchId : input.branchId || undefined,
    period: input.period,
    paymentMethod: input.paymentMethod,
  });
}

export async function listOrgBranches() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
  const branches = await prisma.branch.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(isBranchManager(session.user.role) ? { id: session.user.branchId } : {}),
    },
    orderBy: { name: 'asc' },
    select: { id: true, code: true, name: true, isActive: true },
  });
  return branches;
}

export async function loadBranchDetail(branchId: string) {
  const ctx = await adminCtx();
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: ctx.organizationId },
    include: {
      branchPricing: {
        include: { serviceType: { select: { id: true, name: true, pricePerKg: true } } },
      },
      userBranchRoles: {
        where: { role: { in: [...STAFF_ROLES] } },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, isActive: true, lastLoginAt: true } },
        },
      },
    },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const serviceTypes = await prisma.serviceType.findMany({
    where: { organizationId: ctx.organizationId, isActive: true },
    orderBy: { name: 'asc' },
  });

  return {
    branch: {
      id: branch.id,
      code: branch.code,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      isActive: branch.isActive,
      pricing: branch.branchPricing.map((p) => ({
        serviceTypeId: p.serviceTypeId,
        serviceName: p.serviceType.name,
        defaultPricePerKg: p.serviceType.pricePerKg,
        pricePerKg: p.pricePerKg,
      })),
    },
    staff: branch.userBranchRoles.map((r) => ({
      id: r.user.id,
      role: r.role,
      name: r.user.name,
      email: r.user.email,
      phone: r.user.phone,
      isActive: r.user.isActive,
      lastLoginAt: r.user.lastLoginAt?.toISOString() ?? null,
    })),
    serviceTypes: serviceTypes.map((s) => ({ id: s.id, name: s.name, pricePerKg: s.pricePerKg })),
  };
}

export async function createBranch(input: {
  code: string;
  name: string;
  address?: string;
  phone?: string;
}) {
  const ctx = await adminCtx();
  const code = input.code.trim().toUpperCase();
  if (!code || code.length < 2) throw new Error('Kode cabang minimal 2 karakter');

  const existing = await prisma.branch.findFirst({
    where: { organizationId: ctx.organizationId, code },
  });
  if (existing) throw new Error('Kode cabang sudah digunakan');

  const serviceTypes = await prisma.serviceType.findMany({
    where: { organizationId: ctx.organizationId, isActive: true },
  });

  const branch = await prisma.branch.create({
    data: {
      organizationId: ctx.organizationId,
      code,
      name: input.name.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      branchPricing: {
        create: serviceTypes.map((s) => ({
          serviceTypeId: s.id,
          pricePerKg: s.pricePerKg,
        })),
      },
    },
  });

  await createAuditLog(ctx, 'SETTINGS_CHANGED', 'Branch', branch.id, null, { code, name: branch.name });

  revalidatePath('/owner/admin-console');
  revalidatePath('/owner');
  return { id: branch.id };
}

export async function createBranchStaff(input: {
  branchId: string;
  role: 'CASHIER' | 'WORKER' | 'MANAGER';
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const ctx = await adminCtx();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (name.length < 2) throw new Error('Nama minimal 2 karakter');
  if (input.password.length < 8) throw new Error('Password minimal 8 karakter');

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, organizationId: ctx.organizationId },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.organizationId !== ctx.organizationId) {
      throw new Error('Email sudah digunakan di organisasi lain');
    }

    const roleOnBranch = await prisma.userBranchRole.findUnique({
      where: { userId_branchId: { userId: existing.id, branchId: branch.id } },
    });

    if (roleOnBranch && STAFF_ROLES.includes(roleOnBranch.role as (typeof STAFF_ROLES)[number])) {
      throw new Error('Email sudah terdaftar sebagai staff di cabang ini');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          name,
          phone: input.phone?.trim() || existing.phone,
          passwordHash,
          emailVerified: true,
          profileCompleted: true,
          isActive: true,
        },
      });

      if (roleOnBranch) {
        await tx.userBranchRole.update({
          where: { userId_branchId: { userId: existing.id, branchId: branch.id } },
          data: { role: input.role },
        });
      } else {
        await tx.userBranchRole.create({
          data: { userId: existing.id, branchId: branch.id, role: input.role },
        });
      }
    });

    await createAuditLog(ctx, 'SETTINGS_CHANGED', 'BranchStaff', existing.id, null, {
      branchId: branch.id,
      role: input.role,
      email,
      action: roleOnBranch ? 'upgraded' : 'linked',
    });

    revalidatePath('/owner/admin-console');
    return { ok: true, userId: existing.id };
  }

  const user = await prisma.user.create({
    data: {
      organizationId: ctx.organizationId,
      email,
      name,
      phone: input.phone?.trim(),
      passwordHash,
      emailVerified: true,
      profileCompleted: true,
      branchRoles: {
        create: { branchId: branch.id, role: input.role },
      },
    },
  });

  await createAuditLog(ctx, 'SETTINGS_CHANGED', 'BranchStaff', user.id, null, {
    branchId: branch.id,
    role: input.role,
    email,
    action: 'created',
  });

  revalidatePath('/owner/admin-console');
  return { ok: true, userId: user.id };
}

export async function updateBranchStaff(input: {
  userId: string;
  branchId: string;
  name?: string;
  role?: 'CASHIER' | 'WORKER' | 'MANAGER';
  isActive?: boolean;
  password?: string;
}) {
  const ctx = await adminCtx();
  const link = await prisma.userBranchRole.findFirst({
    where: {
      userId: input.userId,
      branchId: input.branchId,
      user: { organizationId: ctx.organizationId },
    },
  });
  if (!link) throw new Error('Staff tidak ditemukan di cabang ini');

  const data: Record<string, unknown> = {};
  if (input.name) data.name = input.name.trim();
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password && input.password.length >= 8) {
    data.passwordHash = await bcrypt.hash(input.password, 10);
  }

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: input.userId }, data });
  }
  if (input.role) {
    await prisma.userBranchRole.update({
      where: { userId_branchId: { userId: input.userId, branchId: input.branchId } },
      data: { role: input.role },
    });
  }

  revalidatePath('/owner/admin-console');
  return { ok: true };
}

export async function removeBranchStaff(userId: string, branchId: string) {
  const ctx = await adminCtx();
  const deleted = await prisma.userBranchRole.deleteMany({
    where: {
      userId,
      branchId,
      user: { organizationId: ctx.organizationId },
    },
  });
  if (deleted.count === 0) throw new Error('Staff tidak ditemukan di cabang ini');

  await ensureCustomerFallback(userId);

  await createAuditLog(ctx, 'SETTINGS_CHANGED', 'BranchStaff', userId, null, {
    branchId,
    action: 'removed',
  });

  revalidatePath('/owner/admin-console');
  return { ok: true };
}

// Re-export branch update from admin-console pattern
export async function updateBranchFull(input: {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}) {
  const ctx = await adminCtx();
  const branch = await prisma.branch.findFirst({
    where: { id: input.id, organizationId: ctx.organizationId },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  await prisma.branch.update({
    where: { id: input.id },
    data: {
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      isActive: input.isActive,
    },
  });

  revalidatePath('/owner/admin-console');
  revalidatePath('/owner');
  revalidatePath('/cashier');
  return { ok: true };
}

export async function upsertBranchPricingAction(branchId: string, serviceTypeId: string, pricePerKg: number) {
  const ctx = await adminCtx();
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: ctx.organizationId },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  await prisma.branchPricing.upsert({
    where: { branchId_serviceTypeId: { branchId, serviceTypeId } },
    create: { branchId, serviceTypeId, pricePerKg },
    update: { pricePerKg },
  });

  revalidatePath('/owner/admin-console');
  revalidatePath('/cashier');
  return { ok: true };
}

export async function initBranchPricingForOrg() {
  const ctx = await adminCtx();
  const settings = await getOrgSettings(ctx.organizationId);
  await syncCatalogToServiceTypes(ctx.organizationId, settings.catalog);
}
