'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import {
  formatCurrency,
  computeCombinationPayment,
  type CombinationPaymentInput,
} from '@aww/shared';
import { requireAuth } from '@/lib/session';
import { createNotification, notifyBranchRoles } from '@/lib/notify';
import { createAuditLog, updateDailySummary } from '@/lib/audit';
import { sumPaidAmount } from '@/lib/payment-behavior-analytics';
import { notifyCustomerOrderCreated, notifyCustomerOrderStatus } from '@/lib/order-notifications';
import { awardLoyaltyPointsForOrder, awardAppOrderBonus, refundRedeemedPoints } from '@/lib/loyalty';
import { embedPaymentPlanInNotes, parseCustomerPaymentFromNotes } from '@/lib/payment-plan';
import {
  assertStaffOrderBranchInOrg,
  type StaffSession,
} from '@/lib/branch-access';

const STAFF = [Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN];

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'QRIS'] as const;
export type ConfirmPaymentMethod = (typeof PAYMENT_METHODS)[number];

async function loadOrderForStaff(orderId: string, session: StaffSession) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, userId: true, phone: true } },
      serviceType: { select: { name: true, pricePerKg: true } },
      items: true,
      payments: true,
    },
  });
  if (!order) throw new Error('Pesanan tidak ditemukan');

  await assertStaffOrderBranchInOrg(order.branchId, session);

  return order;
}

function isKiloanOrder(items: { description: string }[], weightKg = 0) {
  if (weightKg > 0 && items.length === 0) return true;
  return items.some((i) => i.description.toLowerCase().includes('kiloan'));
}

function validateCombinationProofs(input: CombinationPaymentInput) {
  for (const p of [
    { method: input.dpMethod, proof: input.dpProofUrl, label: 'DP awal' },
    ...(input.remainingTiming === 'NOW'
      ? [{ method: input.remainingMethod, proof: input.remainingProofUrl, label: 'Pelunasan' }]
      : []),
  ]) {
    if ((p.method === 'BANK_TRANSFER' || p.method === 'QRIS') && !p.proof) {
      throw new Error(`Bukti pembayaran wajib untuk ${p.label} (${p.method})`);
    }
  }
}

/** Kasir verifikasi berat/item, terima pembayaran, dan masukkan ke produksi. */
export async function confirmOrderWithPayment(input: {
  orderId: string;
  paymentMethod?: ConfirmPaymentMethod;
  combinationPayment?: CombinationPaymentInput;
  verifiedWeightKg?: number;
  verifiedTotal?: number;
  proofUrl?: string;
}) {
  const session = await requireAuth(STAFF);
  const order = await loadOrderForStaff(input.orderId, session.user);

  if (order.status !== 'ON_HOLD') throw new Error('Pesanan sudah dikonfirmasi');

  const isCombination = !!input.combinationPayment;
  if (isCombination && input.paymentMethod) {
    throw new Error('Gunakan kombinasi pembayaran atau metode tunggal, bukan keduanya');
  }

  const kiloan = isKiloanOrder(order.items, order.weightKg);
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

  const existingPaid = sumPaidAmount(order.payments);
  const prepaidViaApp = existingPaid > 0;
  const customerPayment = parseCustomerPaymentFromNotes(order.notes);
  const payLaterViaApp = customerPayment?.mode === 'PAY_LATER';

  if (!prepaidViaApp && !payLaterViaApp) {
    if (!isCombination && !input.paymentMethod) {
      throw new Error('Pilih metode pembayaran');
    }
    if (!isCombination && input.paymentMethod && !PAYMENT_METHODS.includes(input.paymentMethod)) {
      throw new Error('Metode pembayaran tidak valid');
    }
    if (
      !isCombination &&
      input.paymentMethod &&
      (input.paymentMethod === 'BANK_TRANSFER' || input.paymentMethod === 'QRIS') &&
      !input.proofUrl
    ) {
      throw new Error('Bukti pembayaran wajib untuk Transfer dan QRIS');
    }
    if (isCombination) {
      validateCombinationProofs(input.combinationPayment!);
    }
  }

  let combinationPlan: ReturnType<typeof computeCombinationPayment> | null = null;
  if (!prepaidViaApp && isCombination) {
    combinationPlan = computeCombinationPayment(finalTotal, input.combinationPayment!);
  }

  const paymentStatus = prepaidViaApp
    ? existingPaid >= finalTotal
      ? 'PAID'
      : 'PARTIAL'
    : payLaterViaApp
      ? 'UNPAID'
      : isCombination
        ? combinationPlan!.paymentStatus
        : 'PAID';

  let pointsEarned = 0;
  let appBonus = 0;

  const orderNotes =
    !prepaidViaApp && isCombination
      ? embedPaymentPlanInNotes(order.notes, input.combinationPayment!)
      : order.notes;

  await prisma.$transaction(async (tx) => {
    if (!prepaidViaApp && !payLaterViaApp) {
      if (isCombination) {
        for (const p of combinationPlan!.payments) {
          await tx.payment.create({
            data: {
              orderId: order.id,
              branchId: order.branchId,
              amount: p.amount,
              method: p.method,
              receivedById: session.user.id,
              status: 'PAID',
              proofUrl: p.proofUrl ?? null,
            },
          });
        }
      } else {
        await tx.payment.create({
          data: {
            orderId: order.id,
            branchId: order.branchId,
            amount: finalTotal,
            method: input.paymentMethod!,
            receivedById: session.user.id,
            status: 'PAID',
            proofUrl: input.proofUrl ?? null,
          },
        });
      }
    }

    const statusNote = prepaidViaApp
      ? `Dikonfirmasi kasir · Pembayaran ${order.fromApp ? 'via app' : 'di kasir'} sudah tercatat (${formatCurrency(existingPaid)}${existingPaid < finalTotal ? ` · sisa ${formatCurrency(finalTotal - existingPaid)}` : ''})${kiloan && weightKg ? ` · ${weightKg} kg` : ''}`
      : payLaterViaApp
        ? `Dikonfirmasi kasir · Bayar nanti setelah cucian selesai · ${formatCurrency(finalTotal)}${kiloan && weightKg ? ` · ${weightKg} kg` : ''}`
        : isCombination
        ? combinationPlan!.paymentStatus === 'PARTIAL'
          ? `Dikonfirmasi kasir · DP ${formatCurrency(combinationPlan!.dpAmount)} ${input.combinationPayment!.dpMethod} · sisa ${formatCurrency(combinationPlan!.remainingAmount)} via ${input.combinationPayment!.remainingMethod} (nanti)`
          : `Dikonfirmasi kasir · Kombinasi lunas · DP ${formatCurrency(combinationPlan!.dpAmount)} + pelunasan ${formatCurrency(combinationPlan!.remainingAmount)}`
        : `Dikonfirmasi kasir · Bayar ${input.paymentMethod}${kiloan && weightKg ? ` · ${weightKg} kg` : ''}${order.discount > 0 ? ` · diskon poin ${formatCurrency(order.discount)}` : ''}`;

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'RECEIVED',
        paymentStatus,
        weightKg,
        subtotal: finalTotal + order.discount,
        total: finalTotal,
        notes: orderNotes,
        statusLogs: {
          create: {
            fromStatus: 'ON_HOLD',
            toStatus: 'RECEIVED',
            changedById: session.user.id,
            note: statusNote,
          },
        },
      },
    });

    if (paymentStatus === 'PAID' && weightKg > 0) {
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

  const paymentMsg = paymentStatus === 'PARTIAL'
    ? `DP diterima. Sisa ${formatCurrency(combinationPlan!.remainingAmount)} bayar setelah selesai.`
    : payLaterViaApp
      ? 'Cucian diterima — bayar setelah selesai saat pengambilan.'
      : 'Pembayaran lunas.';

  if (order.customer.userId) {
    const bonusParts: string[] = [];
    if (appBonus > 0) bonusParts.push(`+${appBonus} poin pesan via app`);
    if (pointsEarned > 0) bonusParts.push(`+${pointsEarned} poin loyalty`);
    const pointMsg = bonusParts.length > 0 ? ` ${bonusParts.join(' · ')}!` : '';
    await createNotification({
      userId: order.customer.userId,
      type: 'ORDER_CONFIRMATION',
      title: 'Pesanan & pembayaran dikonfirmasi ✅',
      body: `${order.orderNumber} diterima. ${paymentMsg} Cucian masuk produksi.${pointMsg}`,
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

  if (order.customer.phone) {
    const branch = await prisma.branch.findUnique({ where: { id: order.branchId } });
    void notifyCustomerOrderCreated({
      phone: order.customer.phone,
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      serviceName: order.serviceType.name,
      weightKg,
      total: finalTotal,
      branchName: branch?.name ?? 'AWW Laundry',
      paid: paymentStatus === 'PAID',
    }).catch(() => {});
  }

  const auditCtx = {
    organizationId: session.user.organizationId,
    branchId: order.branchId,
    userId: session.user.id,
  };
  await createAuditLog(
    auditCtx,
    'ORDER_STATUS_CHANGED',
    'Order',
    order.id,
    { status: 'ON_HOLD' },
    {
      status: 'RECEIVED',
      orderNumber: order.orderNumber,
      paymentMethod: input.paymentMethod,
      combinationPayment: input.combinationPayment,
      paymentStatus,
      weightKg,
      total: finalTotal,
    }
  );
  await createAuditLog(
    auditCtx,
    'PAYMENT_RECEIVED',
    'Payment',
    order.id,
    null,
    isCombination
      ? {
          payments: combinationPlan!.payments.map((p) => ({
            amount: p.amount,
            method: p.method,
            label: p.label,
          })),
          paymentStatus,
          orderNumber: order.orderNumber,
        }
      : { amount: finalTotal, method: input.paymentMethod, orderNumber: order.orderNumber }
  );

  await updateDailySummary(order.branchId);

  revalidatePath('/cashier/inbox');
  revalidatePath('/cashier');
  revalidatePath('/cashier/cashflow');
  revalidatePath('/worker');
  revalidatePath('/owner');
  revalidatePath('/owner/orders');
  revalidatePath('/owner/cashflow');
  revalidatePath('/owner/analytics');
  revalidatePath('/owner/audit-trail');
  revalidatePath(`/orders/${order.id}`);
  revalidatePath('/customer/history');
  revalidatePath('/customer');
  revalidatePath('/customer/profile');

  return { ok: true, total: finalTotal, weightKg, pointsEarned, appBonus, paymentStatus };
}

export async function rejectOrder(orderId: string, reason?: string) {
  const session = await requireAuth(STAFF);
  const order = await loadOrderForStaff(orderId, session.user);
  if (order.status !== 'ON_HOLD') throw new Error('Pesanan tidak bisa ditolak');

  const hadPaidPayments = order.payments.some((p) => p.status === 'PAID');

  await prisma.$transaction(async (tx) => {
    await refundRedeemedPoints(tx, orderId, order.customerId);

    if (hadPaidPayments) {
      await tx.payment.updateMany({
        where: { orderId, status: 'PAID' },
        data: { status: 'REFUNDED' },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        ...(hadPaidPayments ? { paymentStatus: 'REFUNDED' } : {}),
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

  if (order.customer.phone) {
    const branch = await prisma.branch.findUnique({ where: { id: order.branchId } });
    void notifyCustomerOrderStatus({
      phone: order.customer.phone,
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      newStatus: 'CANCELLED',
      branchName: branch?.name ?? 'AWW Laundry',
    }).catch(() => {});
  }

  await createAuditLog(
    {
      organizationId: session.user.organizationId,
      branchId: order.branchId,
      userId: session.user.id,
    },
    'ORDER_CANCELLED',
    'Order',
    order.id,
    { status: 'ON_HOLD' },
    { status: 'CANCELLED', orderNumber: order.orderNumber, reason: reason || 'Ditolak kasir' }
  );

  await updateDailySummary(order.branchId);

  revalidatePath('/cashier/inbox');
  revalidatePath('/cashier/cashflow');
  revalidatePath('/customer');
  revalidatePath('/customer/profile');
  revalidatePath('/owner/cashflow');
  revalidatePath('/owner/analytics');
  revalidatePath('/owner/audit-trail');
  return { ok: true };
}
