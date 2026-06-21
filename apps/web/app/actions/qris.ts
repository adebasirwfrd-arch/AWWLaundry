'use server';

import { prisma } from '@aww/database';
import { requireAuth } from '@/lib/session';
import {
  generateDynamicQrisPayload,
  resolveQrisMerchantConfig,
} from '@/lib/qris-dynamic';

export async function generateOrderQrisPayload(orderNumber: string, amount: number) {
  const session = await requireAuth();
  const branch = await prisma.branch.findUnique({
    where: { id: session.user.branchId },
    select: { settings: true, name: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const merchant = resolveQrisMerchantConfig(branch.settings);
  if (!merchant) {
    throw new Error(
      'Konfigurasi QRIS belum diatur. Hubungi owner untuk mengisi QRIS_MERCHANT_PAN di pengaturan.'
    );
  }

  const payload = generateDynamicQrisPayload({
    amount,
    reference: orderNumber,
    merchant: {
      ...merchant,
      merchantName: merchant.merchantName || branch.name,
    },
  });

  return { payload, amount, reference: orderNumber };
}

export async function generatePosQrisPayload(amount: number, reference?: string) {
  const session = await requireAuth();
  const branch = await prisma.branch.findUnique({
    where: { id: session.user.branchId },
    select: { settings: true, name: true, code: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const merchant = resolveQrisMerchantConfig(branch.settings);
  if (!merchant) {
    throw new Error(
      'Konfigurasi QRIS belum diatur. Hubungi owner untuk mengisi QRIS_MERCHANT_PAN.'
    );
  }

  const ref = reference ?? `POS-${branch.code}-${Date.now()}`;
  const payload = generateDynamicQrisPayload({
    amount,
    reference: ref,
    merchant: {
      ...merchant,
      merchantName: merchant.merchantName || branch.name,
    },
  });

  return { payload, amount, reference: ref };
}
