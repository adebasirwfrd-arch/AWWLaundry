'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import {
  getOrgSettings,
  saveOrgSettings,
  syncCatalogToServiceTypes,
  type CatalogCategory,
  type CatalogItem,
  type LoyaltySettings,
} from '@/lib/org-settings';

const ADMIN_ROLES = [Role.OWNER, Role.SUPER_ADMIN];

async function adminCtx() {
  const session = await requireAuth(ADMIN_ROLES);
  return {
    organizationId: session.user.organizationId,
    branchId: session.user.branchId,
    userId: session.user.id,
  };
}

export async function loadAdminConsoleData() {
  const { organizationId } = await adminCtx();

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  let settings = await getOrgSettings(organizationId);
  let parsed: { catalog?: unknown[] } | null = null;
  try {
    parsed = org?.settings ? JSON.parse(org.settings) : null;
  } catch {
    parsed = null;
  }
  if (!parsed?.catalog?.length) {
    await saveOrgSettings(organizationId, settings);
    await syncCatalogToServiceTypes(organizationId, settings.catalog);
    settings = await getOrgSettings(organizationId);
  }

  const [branches, serviceTypes] = await Promise.all([
    prisma.branch.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: {
        branchPricing: { include: { serviceType: { select: { id: true, name: true, pricePerKg: true } } } },
      },
    }),
    prisma.serviceType.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    settings,
    branches: branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      address: b.address,
      phone: b.phone,
      isActive: b.isActive,
      pricing: b.branchPricing.map((p) => ({
        id: p.id,
        serviceTypeId: p.serviceTypeId,
        serviceName: p.serviceType.name,
        defaultPricePerKg: p.serviceType.pricePerKg,
        pricePerKg: p.pricePerKg,
      })),
    })),
    serviceTypes: serviceTypes.map((s) => ({
      id: s.id,
      name: s.name,
      pricePerKg: s.pricePerKg,
      estimatedHours: s.estimatedHours,
      isActive: s.isActive,
    })),
  };
}

export async function updateCatalogCategory(slug: string, input: Partial<CatalogCategory>) {
  const ctx = await adminCtx();
  const settings = await getOrgSettings(ctx.organizationId);
  const idx = settings.catalog.findIndex((c) => c.slug === slug);
  if (idx < 0) throw new Error('Kategori tidak ditemukan');

  const prev = settings.catalog[idx];
  settings.catalog[idx] = {
    ...prev,
    ...input,
    slug: prev.slug,
    items: input.items ?? prev.items,
  };

  await saveOrgSettings(ctx.organizationId, settings);
  await syncCatalogToServiceTypes(ctx.organizationId, settings.catalog);

  await createAuditLog(ctx, 'SETTINGS_CHANGED', 'CatalogCategory', slug, prev, settings.catalog[idx]);

  revalidatePath('/owner/admin-console');
  revalidatePath('/customer');
  revalidatePath('/cashier');
  return { ok: true };
}

export async function createCatalogCategory(input: {
  slug: string;
  title: string;
  emoji: string;
  info: string;
  estimatedHours: number;
  pricePerKg: number;
  items: CatalogItem[];
}) {
  const ctx = await adminCtx();
  const settings = await getOrgSettings(ctx.organizationId);

  if (settings.catalog.some((c) => c.slug === input.slug)) {
    throw new Error('Slug kategori sudah ada');
  }

  const category: CatalogCategory = {
    slug: input.slug,
    title: input.title,
    emoji: input.emoji,
    gradient: 'from-rainbow-cyan to-brand-sky',
    glow: 'shadow-aww-glow-bubble',
    info: input.info,
    estimatedHours: input.estimatedHours,
    pricePerKg: input.pricePerKg,
    items: input.items,
  };

  settings.catalog.push(category);
  await saveOrgSettings(ctx.organizationId, settings);
  await syncCatalogToServiceTypes(ctx.organizationId, settings.catalog);

  revalidatePath('/owner/admin-console');
  revalidatePath('/customer');
  return { ok: true };
}

export async function deleteCatalogCategory(slug: string) {
  const ctx = await adminCtx();
  const settings = await getOrgSettings(ctx.organizationId);
  if (settings.catalog.length <= 1) throw new Error('Minimal harus ada 1 kategori');

  const deleted = settings.catalog.find((c) => c.slug === slug);
  settings.catalog = settings.catalog.filter((c) => c.slug !== slug);
  await saveOrgSettings(ctx.organizationId, settings);

  if (deleted) {
    const svc = await prisma.serviceType.findFirst({
      where: { organizationId: ctx.organizationId, name: deleted.title },
    });
    if (svc) {
      await prisma.serviceType.update({ where: { id: svc.id }, data: { isActive: false } });
    }
  }

  revalidatePath('/owner/admin-console');
  revalidatePath('/customer');
  return { ok: true };
}

export async function updateLoyaltySettings(loyalty: LoyaltySettings) {
  const ctx = await adminCtx();
  const settings = await getOrgSettings(ctx.organizationId);
  settings.loyalty = loyalty;
  await saveOrgSettings(ctx.organizationId, settings);

  await createAuditLog(ctx, 'SETTINGS_CHANGED', 'LoyaltySettings', ctx.organizationId, null, loyalty);

  revalidatePath('/owner/admin-console');
  revalidatePath('/customer');
  return { ok: true };
}

export async function updateOrgProfile(input: { name: string; tagline: string }) {
  const ctx = await adminCtx();
  const settings = await getOrgSettings(ctx.organizationId);
  settings.tagline = input.tagline;

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { name: input.name, settings: JSON.stringify(settings) },
  });

  revalidatePath('/owner/admin-console');
  return { ok: true };
}

export async function updateBranch(input: {
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
      code: input.code,
      name: input.name,
      address: input.address || null,
      phone: input.phone || null,
      isActive: input.isActive,
    },
  });

  revalidatePath('/owner/admin-console');
  revalidatePath('/cashier');
  return { ok: true };
}

export async function upsertBranchPricing(branchId: string, serviceTypeId: string, pricePerKg: number) {
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

export async function updateServiceType(input: {
  id: string;
  name: string;
  pricePerKg: number;
  estimatedHours: number;
  isActive: boolean;
}) {
  const ctx = await adminCtx();
  const svc = await prisma.serviceType.findFirst({
    where: { id: input.id, organizationId: ctx.organizationId },
  });
  if (!svc) throw new Error('Layanan tidak ditemukan');

  await prisma.serviceType.update({
    where: { id: input.id },
    data: {
      name: input.name,
      pricePerKg: input.pricePerKg,
      estimatedHours: input.estimatedHours,
      isActive: input.isActive,
    },
  });

  revalidatePath('/owner/admin-console');
  revalidatePath('/cashier');
  return { ok: true };
}
