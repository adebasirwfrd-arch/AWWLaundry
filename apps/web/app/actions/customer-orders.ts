'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { generateOrderNumber, redemptionDiscount, computeCombinationPayment, methodNeedsProof, PAYMENT_METHOD_LABELS, type CustomerOrderPaymentInput } from '@aww/shared';
import { getOrgSettings } from '@/lib/org-settings';
import { requireAuth } from '@/lib/session';
import { getCategoryForOrg } from '@/lib/org-settings';
import { notifyBranchRoles } from '@/lib/notify';
import { refundRedeemedPoints } from '@/lib/loyalty';
import { getBranchPrice } from '@/lib/audit';
import { embedCustomerPaymentInNotes, parseCustomerPaymentFromNotes } from '@/lib/payment-plan';
import { buildReceiptPaymentFields } from '@/lib/receipt-payment';

/**
 * Find or create the Customer record linked to the logged-in customer user.
 */
async function resolveCustomer(userId: string, organizationId: string) {
  const existing = await prisma.customer.findUnique({ where: { userId } });
  if (existing) return existing;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User tidak ditemukan');

  const phone = user.phone || `USR-${userId.slice(-8)}`;
  return prisma.customer.create({
    data: {
      organizationId,
      userId,
      name: user.name,
      phone,
      email: user.email,
    },
  });
}

export async function createCustomerOrder(input: {
  category: string;
  branchId: string;
  orderMode: 'satuan' | 'kiloan';
  items?: { key: string; label: string; qty: number; unitPrice: number }[];
  weightKg?: number;
  notes?: string;
  redeemPoints?: boolean;
  payment: CustomerOrderPaymentInput;
}) {
  const session = await requireAuth([Role.CUSTOMER]);
  const { id: userId, organizationId } = session.user;

  const cat = await getCategoryForOrg(organizationId, input.category);
  if (!cat) throw new Error('Kategori layanan tidak valid');

  const orgSettings = await getOrgSettings(organizationId);
  const redeemCost = orgSettings.loyalty.redeemCost;

  const branch = await prisma.branch.findFirst({
    where: { id: input.branchId, organizationId, isActive: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan atau tidak aktif');

  let serviceType = await prisma.serviceType.findFirst({
    where: { organizationId, name: cat.title },
  });
  if (!serviceType) {
    serviceType = await prisma.serviceType.create({
      data: {
        organizationId,
        name: cat.title,
        pricePerKg: cat.pricePerKg,
        estimatedHours: cat.estimatedHours,
      },
    });
  }

  let total: number;
  let totalItems: number;
  let weightKg = 0;
  let discount = 0;
  let loyaltyPointsRedeemed = 0;
  let lineItems: { description: string; qty: number; unitPrice: number; total: number }[];
  const pricePerKg =
    input.orderMode === 'kiloan'
      ? await getBranchPrice(branch.id, serviceType.id)
      : cat.pricePerKg;

  if (input.orderMode === 'kiloan') {
    const w = input.weightKg ?? 0;
    if (w <= 0) throw new Error('Harap masukkan berat cucian (kg)!');

    weightKg = w;
    total = Math.round(w * pricePerKg);
    totalItems = 1;
    lineItems = [{
      description: `Kiloan ${w} kg (${cat.title})`,
      qty: 1,
      unitPrice: total,
      total,
    }];
  } else {
    const chosen = (input.items ?? []).filter((i) => i.qty > 0);
    if (chosen.length === 0) throw new Error('Harap pilih jenis barang!');
    total = chosen.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    totalItems = chosen.reduce((sum, i) => sum + i.qty, 0);
    lineItems = chosen.map((i) => ({
      description: `${i.label} (${cat.title})`,
      qty: i.qty,
      unitPrice: i.unitPrice,
      total: i.qty * i.unitPrice,
    }));
  }

  const customer = await resolveCustomer(userId, organizationId);

  if (input.redeemPoints) {
    if (input.orderMode !== 'kiloan') {
      throw new Error('Redeem poin hanya untuk pesanan kiloan');
    }
    if (customer.loyaltyPoints < redeemCost) {
      throw new Error(`Poin tidak cukup. Butuh ${redeemCost} poin untuk gratis 1 kg.`);
    }
    discount = redemptionDiscount(pricePerKg);
    loyaltyPointsRedeemed = redeemCost;
    total = Math.max(0, total - discount);
    lineItems.push({
      description: 'Redeem poin — gratis 1 kg',
      qty: 1,
      unitPrice: -discount,
      total: -discount,
    });
  }

  const estimatedReadyAt = new Date(Date.now() + cat.estimatedHours * 3600 * 1000);

  const payment = input.payment;
  if (!payment?.mode) throw new Error('Pilih metode pembayaran');

  if (payment.mode === 'QRIS' || payment.mode === 'BANK_TRANSFER') {
    if (!payment.proofUrl) throw new Error('Upload bukti pembayaran wajib');
  }

  if (payment.mode === 'COMBINATION') {
    if (!payment.combination) throw new Error('Lengkapi detail pembayaran kombinasi');
    const cp = payment.combination;
    if (cp.dpAmount <= 0 || cp.dpAmount >= total) {
      throw new Error('Jumlah DP tidak valid');
    }
    for (const p of [
      { method: cp.dpMethod, proof: cp.dpProofUrl, label: 'DP awal' },
      ...(cp.remainingTiming === 'NOW'
        ? [{ method: cp.remainingMethod, proof: cp.remainingProofUrl, label: 'Pelunasan' }]
        : []),
    ]) {
      if (methodNeedsProof(p.method) && !p.proof) {
        throw new Error(`Upload bukti ${p.label} wajib`);
      }
    }
  }

  let combinationPlan: ReturnType<typeof computeCombinationPayment> | null = null;
  if (payment.mode === 'COMBINATION' && payment.combination) {
    combinationPlan = computeCombinationPayment(total, payment.combination);
  }

  const paymentStatus =
    payment.mode === 'CASH' || payment.mode === 'PAY_LATER'
      ? 'UNPAID'
      : payment.mode === 'COMBINATION'
        ? combinationPlan!.paymentStatus
        : 'PAID';

  const orderNotes = embedCustomerPaymentInNotes(input.notes, payment);

  const order = await prisma.$transaction(async (tx) => {
    if (loyaltyPointsRedeemed > 0) {
      const updated = await tx.customer.updateMany({
        where: { id: customer.id, loyaltyPoints: { gte: redeemCost } },
        data: { loyaltyPoints: { decrement: redeemCost } },
      });
      if (updated.count === 0) throw new Error('Poin tidak cukup untuk redeem');
    }

    return tx.order.create({
      data: {
        branchId: branch.id,
        customerId: customer.id,
        orderNumber: generateOrderNumber(branch.code),
        weightKg,
        serviceTypeId: serviceType.id,
        subtotal: total + discount,
        discount,
        loyaltyPointsRedeemed,
        total,
        // App orders await cashier confirmation before entering production.
        status: 'ON_HOLD',
        paymentStatus,
        fromApp: true,
        estimatedReadyAt,
        createdById: userId,
        notes: orderNotes,
        items: {
          create: lineItems,
        },
        payments:
          payment.mode === 'CASH' || payment.mode === 'PAY_LATER'
            ? undefined
            : payment.mode === 'COMBINATION'
              ? {
                  create: combinationPlan!.payments.map((p) => ({
                    branchId: branch.id,
                    amount: p.amount,
                    method: p.method,
                    receivedById: userId,
                    status: 'PAID' as const,
                    proofUrl: p.proofUrl ?? null,
                  })),
                }
              : {
                  create: {
                    branchId: branch.id,
                    amount: total,
                    method: payment.mode,
                    receivedById: userId,
                    status: 'PAID',
                    proofUrl: payment.proofUrl ?? null,
                  },
                },
        statusLogs: {
          create: {
            toStatus: 'ON_HOLD',
            changedById: userId,
            note: buildStatusNote(payment, loyaltyPointsRedeemed, combinationPlan),
          },
        },
      },
      include: { items: true },
    });
  });

  // Notify cashiers/managers/owner to confirm the new app order.
  await notifyBranchRoles({
    branchId: branch.id,
    roles: [Role.CASHIER, Role.MANAGER, Role.OWNER],
    type: 'ORDER_CONFIRMATION',
    title: 'Pesanan baru dari aplikasi',
    body: `${customer.name} memesan ${cat.title} (${input.orderMode === 'kiloan' ? `${weightKg} kg` : `${totalItems} item`}) — perlu dikonfirmasi.`,
    data: { orderId: order.id, orderNumber: order.orderNumber },
  });

  revalidatePath('/customer/history');
  revalidatePath('/customer');
  revalidatePath('/customer/profile');
  revalidatePath('/cashier/inbox');

  const receiptPayment =
    payment.mode === 'COMBINATION' && combinationPlan
      ? {
          payments: combinationPlan.payments.map((p) => ({
            method: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
            amount: p.amount,
            label: p.label,
          })),
          remainingAmount:
            combinationPlan.remainingTiming === 'LATER' ? combinationPlan.remainingAmount : undefined,
          remainingMethod: combinationPlan.remainingMethod
            ? (PAYMENT_METHOD_LABELS[combinationPlan.remainingMethod] ?? combinationPlan.remainingMethod)
            : undefined,
          paymentMethod: payment.combination!.dpMethod,
        }
      : paymentStatus === 'PAID'
        ? {
            payments: [
              {
                method: PAYMENT_METHOD_LABELS[payment.mode] ?? payment.mode,
                amount: total,
                label: 'Pembayaran',
              },
            ],
            paymentMethod: payment.mode,
          }
        : buildReceiptPaymentFields({
            total,
            paymentStatus,
            paymentMode: payment.mode,
            payments: [],
            notes: orderNotes,
          });

  return {
    orderNumber: order.orderNumber,
    total,
    discount,
    totalItems,
    weightKg,
    serviceName: cat.title,
    customerName: customer.name,
    customerPhone: customer.phone.startsWith('USR-') ? undefined : customer.phone,
    branchName: branch.name,
    branchPhone: branch.phone ?? undefined,
    estimatedReadyAt: estimatedReadyAt.toISOString(),
    paymentStatus,
    paymentMode: payment.mode,
    ...receiptPayment,
    items: order.items.map((it) => ({ description: it.description, qty: it.qty, total: it.total })),
  };
}

function buildStatusNote(
  payment: CustomerOrderPaymentInput,
  loyaltyRedeemed: number,
  combinationPlan: ReturnType<typeof computeCombinationPayment> | null
) {
  const parts: string[] = ['Dipesan via aplikasi pelanggan'];
  if (loyaltyRedeemed > 0) parts.push('redeem poin (gratis 1 kg)');
  if (payment.mode === 'CASH') parts.push('bayar tunai di kasir');
  else if (payment.mode === 'PAY_LATER') parts.push('bayar nanti setelah cucian selesai');
  else if (payment.mode === 'QRIS') parts.push('bayar QRIS (bukti diupload)');
  else if (payment.mode === 'BANK_TRANSFER') parts.push('bayar transfer (bukti diupload)');
  else if (payment.mode === 'COMBINATION' && combinationPlan) {
    parts.push(
      combinationPlan.paymentStatus === 'PARTIAL'
        ? `kombinasi DP ${combinationPlan.dpAmount} · sisa ${combinationPlan.remainingAmount} nanti`
        : 'kombinasi lunas via app'
    );
  }
  return parts.join(' · ');
}

export async function deleteCustomerOrder(orderId: string) {
  const session = await requireAuth([Role.CUSTOMER]);
  const { id: userId } = session.user;

  const customer = await prisma.customer.findUnique({ where: { userId } });
  if (!customer) throw new Error('Data pelanggan tidak ditemukan');

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.customerId !== customer.id) {
    throw new Error('Pesanan tidak ditemukan');
  }
  if (order.status !== 'ON_HOLD') {
    throw new Error('Pesanan sedang diproses dan tidak bisa dibatalkan');
  }

  await prisma.$transaction(async (tx) => {
    await refundRedeemedPoints(tx, orderId, customer.id);
    await tx.order.delete({ where: { id: orderId } });
  });
  revalidatePath('/customer/history');
  return { ok: true };
}
