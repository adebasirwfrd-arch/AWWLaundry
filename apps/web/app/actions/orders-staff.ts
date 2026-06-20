'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { formatCurrency } from '@aww/shared';
import { requireAuth } from '@/lib/session';
import { createNotification, notifyBranchRoles } from '@/lib/notify';
import { awardLoyaltyPointsForOrder, awardAppOrderBonus, refundRedeemedPoints } from '@/lib/loyalty';

const STAFF = [Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN];

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'QRIS'] as const;
export type ConfirmPaymentMethod = (typeof PAYMENT_METHODS)[number];

async function loadOrderForStaff(orderId: string, branchId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, userId: true, phone: true } },
      serviceType: { select: { name: true, pricePerKg: true } },
      items: true,
    },
  });
  if (!order || order.branchId !== branchId) throw new Error('Pesanan tidak ditemukan');
  return order;
}

function isKiloanOrder(items: { description: string }[]) {
  return items.some((i) => i.description.toLowerCase().includes('kiloan'));
}

/** Kasir verifikasi berat/item, terima pembayaran, dan masukkan ke produksi. */
export async function confirmOrderWithPayment(input: {
  orderId: string;
  paymentMethod: ConfirmPaymentMethod;
  verifiedWeightKg?: number;
  verifiedTotal?: number;
  proofUrl?: string;
}) {
  const session = await requireAuth(STAFF);
  const order = await loadOrderForStaff(input.orderId, session.user.branchId);

  if (order.status !== 'ON_HOLD') throw new Error('Pesanan sudah dikonfirmasi');
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) throw new Error('Metode pembayaran tidak valid');
  if (
    (input.paymentMethod === 'BANK_TRANSFER' || input.paymentMethod === 'QRIS') &&
    !input.proofUrl
  ) {
    throw new Error('Bukti pembayaran wajib untuk Transfer dan QRIS');
  }

  const kiloan = isKiloanOrder(order.items);
  let weightKg = order.weightKg;
  let finalTotal = order.total;

  if (kiloan && input.verifiedWeightKg != null && input.verifiedWeightKg > 0) {
    weightKg = input.verifiedWeightKg;
    finalTotal = Math.max(0, Math.round(weightKg * order.serviceType.pricePerKg) - order.discount);
  }

  if (input.verifiedTotal != null && input.verifiedTotal >= 0) {
    finalTotal = input.verifiedTotal;
  }

  if (finalTotal <= 0) throw new Error('Total pembayaran tidak valid');

  let pointsEarned = 0;
  let appBonus = 0;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: order.id,
        branchId: order.branchId,
        amount: finalTotal,
        method: input.paymentMethod,
        receivedById: session.user.id,
        status: 'PAID',
        proofUrl: input.proofUrl ?? null,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'RECEIVED',
        paymentStatus: 'PAID',
        weightKg,
        subtotal: finalTotal + order.discount,
        total: finalTotal,
        statusLogs: {
          create: {
            fromStatus: 'ON_HOLD',
            toStatus: 'RECEIVED',
            changedById: session.user.id,
            note: `Dikonfirmasi kasir · Bayar ${input.paymentMethod}${kiloan && weightKg ? ` · ${weightKg} kg` : ''}${order.discount > 0 ? ` · diskon poin ${formatCurrency(order.discount)}` : ''}`,
          },
        },
      },
    });

    if (weightKg > 0) {
      pointsEarned = await awardLoyaltyPointsForOrder(tx, order.id, order.customerId, weightKg);
    }
    if (order.fromApp) {
      appBonus = await awardAppOrderBonus(tx, order.id, order.customerId, session.user.organizationId);
    }
  });

  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  const detailLine = kiloan && weightKg > 0
    ? `${order.customer.name} · ${weightKg} kg · ${formatCurrency(finalTotal)}`
    : `${order.customer.name} · ${itemCount} item · ${formatCurrency(finalTotal)}`;

  if (order.customer.userId) {
    const bonusParts: string[] = [];
    if (appBonus > 0) bonusParts.push(`+${appBonus} poin pesan via app`);
    if (pointsEarned > 0) bonusParts.push(`+${pointsEarned} poin loyalty`);
    const pointMsg = bonusParts.length > 0 ? ` ${bonusParts.join(' · ')}!` : '';
    await createNotification({
      userId: order.customer.userId,
      type: 'ORDER_CONFIRMATION',
      title: 'Pesanan & pembayaran dikonfirmasi ✅',
      body: `${order.orderNumber} diterima. Pembayaran lunas. Cucian masuk produksi.${pointMsg}`,
      data: { orderId: order.id, orderNumber: order.orderNumber, pointsEarned, appBonus },
    });
  }

  await notifyBranchRoles({
    branchId: order.branchId,
    roles: [Role.OWNER, Role.WORKER, Role.MANAGER],
    type: 'ORDER_RECEIVED',
    title: 'Cucian baru masuk produksi',
    body: detailLine,
    data: { orderId: order.id, orderNumber: order.orderNumber },
    excludeUserId: session.user.id,
  });

  revalidatePath('/cashier/inbox');
  revalidatePath('/cashier');
  revalidatePath('/worker');
  revalidatePath('/owner');
  revalidatePath('/owner/orders');
  revalidatePath(`/orders/${order.id}`);
  revalidatePath('/customer/history');
  revalidatePath('/customer');
  revalidatePath('/customer/profile');

  return { ok: true, total: finalTotal, weightKg, pointsEarned, appBonus };
}

export async function rejectOrder(orderId: string, reason?: string) {
  const session = await requireAuth(STAFF);
  const order = await loadOrderForStaff(orderId, session.user.branchId);
  if (order.status !== 'ON_HOLD') throw new Error('Pesanan tidak bisa ditolak');

  await prisma.$transaction(async (tx) => {
    await refundRedeemedPoints(tx, orderId, order.customerId);

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        statusLogs: {
          create: { fromStatus: 'ON_HOLD', toStatus: 'CANCELLED', changedById: session.user.id, note: reason || 'Ditolak kasir' },
        },
      },
    });
  });

  if (order.customer.userId) {
    await createNotification({
      userId: order.customer.userId,
      type: 'ORDER_CONFIRMATION',
      title: 'Pesanan ditolak',
      body: `Maaf, pesanan ${order.orderNumber} tidak dapat diproses${reason ? `: ${reason}` : '.'}`,
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });
  }

  revalidatePath('/cashier/inbox');
  revalidatePath('/customer');
  revalidatePath('/customer/profile');
  return { ok: true };
}
