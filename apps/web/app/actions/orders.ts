'use server';

import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog, getBranchPrice, updateDailySummary } from '@/lib/audit';
import { notifyMachineTroubleReported } from '@/lib/machine-notifications';
import { notifyCustomerOrderCreated, notifyCustomerOrderStatus } from '@/lib/order-notifications';
import { ORDER_STATUS_FLOW, PRODUCTION_GATE_MESSAGE, generateOrderNumber, computeCombinationPayment, type CombinationPaymentInput } from '@aww/shared';
import { revalidatePath } from 'next/cache';
import { awardLoyaltyPointsForOrder } from '@/lib/loyalty';
import { embedPaymentPlanInNotes, parseCustomerPaymentFromNotes } from '@/lib/payment-plan';

export async function createOrder(data: {
  customerName: string;
  customerPhone: string;
  weightKg: number;
  serviceTypeId: string;
  paymentMethod?: string;
  proofUrl?: string;
  combinationPayment?: CombinationPaymentInput;
  notes?: string;
}) {
  const session = await requireAuth();
  const { branchId, id: userId, organizationId } = session.user;

  const isCombination = !!data.combinationPayment;

  if (isCombination && data.paymentMethod) {
    throw new Error('Gunakan kombinasi pembayaran atau metode tunggal, bukan keduanya');
  }

  if (
    data.paymentMethod &&
    (data.paymentMethod === 'BANK_TRANSFER' || data.paymentMethod === 'QRIS') &&
    !data.proofUrl
  ) {
    throw new Error('Bukti pembayaran wajib untuk Transfer dan QRIS');
  }

  if (isCombination) {
    const cp = data.combinationPayment!;
    for (const p of [
      { method: cp.dpMethod, proof: cp.dpProofUrl, label: 'DP awal' },
      ...(cp.remainingTiming === 'NOW'
        ? [{ method: cp.remainingMethod, proof: cp.remainingProofUrl, label: 'Pelunasan' }]
        : []),
    ]) {
      if (
        (p.method === 'BANK_TRANSFER' || p.method === 'QRIS') &&
        !p.proof
      ) {
        throw new Error(`Bukti pembayaran wajib untuk ${p.label} (${p.method})`);
      }
    }
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  let customer = await prisma.customer.findUnique({
    where: {
      organizationId_phone: {
        organizationId,
        phone: data.customerPhone,
      },
    },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        organizationId,
        name: data.customerName,
        phone: data.customerPhone,
      },
    });
  } else if (customer.name !== data.customerName) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: data.customerName },
    });
  }

  const pricePerKg = await getBranchPrice(branchId, data.serviceTypeId);
  const subtotal = data.weightKg * pricePerKg;

  const service = await prisma.serviceType.findUnique({
    where: { id: data.serviceTypeId },
  });

  const estimatedReady = new Date();
  estimatedReady.setHours(estimatedReady.getHours() + (service?.estimatedHours ?? 24));

  const orderNumber = generateOrderNumber(branch.code);

  let combinationPlan: ReturnType<typeof computeCombinationPayment> | null = null;
  if (isCombination) {
    combinationPlan = computeCombinationPayment(subtotal, data.combinationPayment!);
  }

  const orderNotes =
    isCombination && data.combinationPayment
      ? embedPaymentPlanInNotes(data.notes, data.combinationPayment)
      : data.notes;

  const order = await prisma.$transaction(async (tx) => {
    const paymentCreates = isCombination
      ? combinationPlan!.payments.map((p) => ({
          branchId,
          amount: p.amount,
          method: p.method as 'CASH' | 'QRIS' | 'BANK_TRANSFER',
          receivedById: userId,
          status: 'PAID' as const,
          proofUrl: p.proofUrl ?? null,
        }))
      : data.paymentMethod
        ? [{
            branchId,
            amount: subtotal,
            method: data.paymentMethod as 'CASH' | 'QRIS' | 'BANK_TRANSFER',
            receivedById: userId,
            status: 'PAID' as const,
            proofUrl: data.proofUrl ?? null,
          }]
        : undefined;

    const paymentStatus = isCombination
      ? combinationPlan!.paymentStatus
      : data.paymentMethod
        ? 'PAID'
        : 'UNPAID';

    const created = await tx.order.create({
      data: {
        branchId,
        customerId: customer.id,
        orderNumber,
        weightKg: data.weightKg,
        serviceTypeId: data.serviceTypeId,
        subtotal,
        total: subtotal,
        estimatedReadyAt: estimatedReady,
        createdById: userId,
        notes: orderNotes,
        statusLogs: {
          create: {
            fromStatus: null,
            toStatus: 'RECEIVED',
            changedById: userId,
            note: isCombination
              ? combinationPlan!.paymentStatus === 'PARTIAL'
                ? `DP ${combinationPlan!.dpAmount} diterima — sisa ${combinationPlan!.remainingAmount} via ${data.combinationPayment!.remainingMethod} (bayar setelah selesai)`
                : `Kombinasi lunas — DP ${combinationPlan!.dpAmount} + pelunasan ${combinationPlan!.remainingAmount}`
              : 'Order diterima di kasir',
          },
        },
        payments: paymentCreates ? { create: paymentCreates } : undefined,
        paymentStatus,
      },
      include: {
        customer: true,
        serviceType: true,
        branch: true,
      },
    });

    if (paymentStatus === 'PAID' && data.weightKg > 0) {
      await awardLoyaltyPointsForOrder(tx, created.id, customer.id, data.weightKg);
    }

    return created;
  });

  await createAuditLog(
    { organizationId, branchId, userId },
    'ORDER_CREATED',
    'Order',
    order.id,
    null,
    { orderNumber, weightKg: data.weightKg, total: subtotal }
  );

  if (data.paymentMethod || isCombination) {
    const auditPayments = isCombination
      ? combinationPlan!.payments.map((p) => ({ amount: p.amount, method: p.method, label: p.label }))
      : [{ amount: subtotal, method: data.paymentMethod, label: 'Lunas' }];

    await createAuditLog(
      { organizationId, branchId, userId },
      'PAYMENT_RECEIVED',
      'Payment',
      order.id,
      null,
      { payments: auditPayments, paymentStatus: order.paymentStatus }
    );
  }

  await updateDailySummary(branchId);

  void notifyCustomerOrderCreated({
    phone: data.customerPhone,
    customerName: data.customerName,
    orderNumber: order.orderNumber,
    serviceName: order.serviceType.name,
    weightKg: data.weightKg,
    total: order.total,
    branchName: order.branch.name,
    estimatedReadyAt: order.estimatedReadyAt,
    paid: !!data.paymentMethod || isCombination,
  }).catch(() => {});

  revalidatePath('/cashier');
  revalidatePath('/owner/orders');
  revalidatePath(`/orders/${order.id}`);
  revalidatePath('/owner');
  revalidatePath('/worker');
  revalidatePath('/owner/audit-trail');

  return {
    ...order,
    combinationPlan: combinationPlan
      ? {
          dpAmount: combinationPlan.dpAmount,
          remainingAmount: combinationPlan.remainingAmount,
          remainingMethod: combinationPlan.remainingMethod,
          remainingTiming: combinationPlan.remainingTiming,
          payments: combinationPlan.payments,
        }
      : null,
  };
}

export async function updateOrderStatus(orderId: string, newStatus: string, note?: string) {
  const session = await requireAuth();
  const { id: userId, organizationId, role } = session.user;
  const isOwnerLike = role === Role.OWNER || role === Role.SUPER_ADMIN;

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      branch: { organizationId },
      ...(isOwnerLike ? {} : { branchId: session.user.branchId }),
    },
  });
  if (!order) throw new Error('Order tidak ditemukan');

  if (order.status === 'ON_HOLD') {
    throw new Error('Pesanan menunggu konfirmasi kasir — belum bisa masuk produksi');
  }
  if (order.paymentStatus === 'UNPAID') {
    const payLater = parseCustomerPaymentFromNotes(order.notes)?.mode === 'PAY_LATER';
    if (!payLater) throw new Error(PRODUCTION_GATE_MESSAGE);
  }

  const allowedNext = ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.indexOf(order.status as typeof ORDER_STATUS_FLOW[number]) + 1];
  if (!allowedNext || newStatus !== allowedNext) {
    throw new Error('Perubahan status tidak valid');
  }

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'READY') updateData.readyAt = new Date();
  if (newStatus === 'PICKED_UP') updateData.pickedUpAt = new Date();

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...updateData,
      statusLogs: {
        create: {
          fromStatus: order.status,
          toStatus: newStatus as typeof order.status,
          changedById: userId,
          note,
        },
      },
    },
    include: { customer: true, serviceType: true, branch: true },
  });

  await createAuditLog(
    { organizationId, branchId: order.branchId, userId },
    'ORDER_STATUS_CHANGED',
    'Order',
    orderId,
    { status: order.status },
    { status: newStatus }
  );

  await updateDailySummary(order.branchId);

  if (updated.customer.phone) {
    void notifyCustomerOrderStatus({
      phone: updated.customer.phone,
      customerName: updated.customer.name,
      orderNumber: updated.orderNumber,
      newStatus,
      branchName: updated.branch.name,
      branchPhone: updated.branch.phone,
    }).catch(() => {});
  }

  revalidatePath('/worker');
  revalidatePath('/owner');
  revalidatePath('/cashier');
  revalidatePath('/owner/audit-trail');

  return updated;
}

export async function receivePayment(
  orderId: string,
  method: string,
  amount: number,
  proofUrl?: string
) {
  const session = await requireAuth();
  const { branchId, id: userId, organizationId } = session.user;

  const order = await prisma.order.findFirst({
    where: { id: orderId, branchId },
  });
  if (!order) throw new Error('Order tidak ditemukan');

  if (
    (method === 'BANK_TRANSFER' || method === 'QRIS') &&
    !proofUrl
  ) {
    throw new Error('Bukti pembayaran wajib untuk Transfer dan QRIS');
  }

  await prisma.payment.create({
    data: {
      orderId,
      branchId,
      amount,
      method: method as 'CASH' | 'QRIS' | 'BANK_TRANSFER',
      receivedById: userId,
      proofUrl: proofUrl ?? null,
    },
  });

  const totalPaid = await prisma.payment.aggregate({
    where: { orderId },
    _sum: { amount: true },
  });

  const paidAmount = totalPaid._sum.amount ?? 0;
  const paymentStatus = paidAmount >= order.total ? 'PAID' : paidAmount > 0 ? 'PARTIAL' : 'UNPAID';

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus },
    });

    if (paymentStatus === 'PAID' && order.weightKg > 0) {
      await awardLoyaltyPointsForOrder(tx, orderId, order.customerId, order.weightKg);
    }
  });

  await createAuditLog(
    { organizationId, branchId, userId },
    'PAYMENT_RECEIVED',
    'Payment',
    orderId,
    null,
    { amount, method }
  );

  await updateDailySummary(branchId);
  revalidatePath('/cashier');
  revalidatePath('/owner');
  revalidatePath(`/orders/${orderId}`);

  return { success: true, paymentStatus };
}

export async function reportMachineTrouble(machineId: string, note: string) {
  const session = await requireAuth();
  const { id: userId, organizationId, role } = session.user;
  const isOwnerLike = role === Role.OWNER || role === Role.SUPER_ADMIN;
  const trimmed = note.trim();
  if (!trimmed) throw new Error('Deskripsi masalah wajib diisi');

  const machine = await prisma.machine.findFirst({
    where: {
      id: machineId,
      branch: { organizationId },
      ...(isOwnerLike ? {} : { branchId: session.user.branchId }),
    },
    include: { branch: { select: { name: true } } },
  });
  if (!machine) throw new Error('Mesin tidak ditemukan');

  await prisma.machine.update({
    where: { id: machineId },
    data: { status: 'TROUBLE' },
  });

  const log = await prisma.machineLog.create({
    data: {
      machineId,
      eventType: 'TROUBLE_REPORTED',
      reportedById: userId,
      note: trimmed,
    },
  });

  await createAuditLog(
    { organizationId, branchId: machine.branchId, userId },
    'MACHINE_TROUBLE_REPORTED',
    'Machine',
    machineId,
    null,
    { note: trimmed, machineName: machine.name, machineLogId: log.id }
  );

  void notifyMachineTroubleReported({
    machineLogId: log.id,
    machineId,
    machineName: machine.name,
    machineType: machine.type,
    branchId: machine.branchId,
    branchName: machine.branch.name,
    note: trimmed,
    reportedByName: session.user.name ?? 'Staff',
    reportedById: userId,
  }).catch(console.error);

  revalidatePath('/worker');
  revalidatePath('/owner');
  revalidatePath('/cashier/inbox');
  revalidatePath('/owner/audit-trail');

  return { ok: true, logId: log.id };
}
