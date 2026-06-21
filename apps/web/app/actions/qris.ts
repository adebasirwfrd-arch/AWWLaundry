'use server';

import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import {
  generateDynamicQrisPayload,
  resolveQrisMerchantConfig,
} from '@/lib/qris-dynamic';

const QRIS_ROLES = [Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.CUSTOMER];

async function qrisForBranch(branchId: string, amount: number, reference: string) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { settings: true, name: true, code: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const merchant = resolveQrisMerchantConfig(branch.settings);
  if (!merchant) {
    throw new Error(
      'Konfigurasi QRIS belum diatur. Hubungi kasir untuk pembayaran tunai/transfer.'
    );
  }

  const payload = generateDynamicQrisPayload({
    amount,
    reference,
    merchant: {
      ...merchant,
      merchantName: merchant.merchantName || branch.name,
    },
  });

  return { payload, amount, reference };
}

export async function generateOrderQrisPayload(orderNumber: string, amount: number) {
  const session = await requireAuth();
  const branch = await prisma.branch.findUnique({
    where: { id: session.user.branchId },
    select: { settings: true, name: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  return qrisForBranch(session.user.branchId, amount, orderNumber);
}

export async function generatePosQrisPayload(amount: number, reference?: string) {
  const session = await requireAuth();
  const branch = await prisma.branch.findUnique({
    where: { id: session.user.branchId },
    select: { code: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const ref = reference ?? `POS-${branch.code}-${Date.now()}`;
  return qrisForBranch(session.user.branchId, amount, ref);
}

/** QRIS dinamis untuk pelanggan saat checkout (sebelum / sesudah order dibuat). */
export async function generateCustomerQrisPayload(
  branchId: string,
  amount: number,
  reference?: string
) {
  await requireAuth(QRIS_ROLES);
  const ref = reference ?? `APP-${Date.now()}`;
  return qrisForBranch(branchId, amount, ref);
}
