'use server';

import { prisma } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog, getBranchPrice, updateDailySummary } from '@/lib/audit';
import { notifyCustomerOrderCreated, notifyCustomerOrderStatus } from '@/lib/order-notifications';
import { ORDER_STATUS_FLOW, PRODUCTION_GATE_MESSAGE, generateOrderNumber } from '@aww/shared';
import { revalidatePath } from 'next/cache';
import { awardLoyaltyPointsForOrder } from '@/lib/loyalty';

export async function createOrder(data: {
  customerName: string;
  customerPhone: string;
  weightKg: number;
  serviceTypeId: string;
  paymentMethod?: string;
  proofUrl?: string;
  notes?: string;
}) {
  const session = await requireAuth();
  const { branchId, id: userId, organizationId } = session.user;

  if (
    data.paymentMethod &&
    (data.paymentMethod === 'BANK_TRANSFER' || data.paymentMethod === 'QRIS') &&
    !data.proofUrl
  ) {
    throw new Error('Bukti pembayaran wajib untuk Transfer dan QRIS');
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

  const order = await prisma.$transaction(async (tx) => {
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
        notes: data.notes,
        statusLogs: {
          create: {
            fromStatus: null,
            toStatus: 'RECEIVED',
            changedById: userId,
            note: 'Order diterima di kasir',
          },
        },
        payments: data.paymentMethod
          ? {
              create: {
                branchId,
                amount: subtotal,
                method: data.paymentMethod as 'CASH' | 'QRIS' | 'BANK_TRANSFER',
                receivedById: userId,
                status: 'PAID',
                proofUrl: data.proofUrl ?? null,
              },
            }
          : undefined,
        paymentStatus: data.paymentMethod ? 'PAID' : 'UNPAID',
      },
      include: {
        customer: true,
        serviceType: true,
        branch: true,
      },
    });

    if (data.paymentMethod && data.weightKg > 0) {
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

  if (data.paymentMethod) {
    await createAuditLog(
      { organizationId, branchId, userId },
      'PAYMENT_RECEIVED',
      'Payment',
      order.id,
      null,
      { amount: subtotal, method: data.paymentMethod }
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
    paid: !!data.paymentMethod,
  }).catch(() => {});

  revalidatePath('/cashier');
  revalidatePath('/owner/orders');
  revalidatePath(`/orders/${order.id}`);
  revalidatePath('/owner');
  revalidatePath('/worker');
  revalidatePath('/owner/audit-trail');

  return order;
}

export async function updateOrderStatus(orderId: string, newStatus: string, note?: string) {
  const session = await requireAuth();
  const { branchId, id: userId, organizationId } = session.user;

  const order = await prisma.order.findFirst({
    where: { id: orderId, branchId },
  });
  if (!order) throw new Error('Order tidak ditemukan');

  if (order.status === 'ON_HOLD') {
    throw new Error('Pesanan menunggu konfirmasi kasir — belum bisa masuk produksi');
  }
  if (order.paymentStatus !== 'PAID') {
    throw new Error(PRODUCTION_GATE_MESSAGE);
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
    { organizationId, branchId, userId },
    'ORDER_STATUS_CHANGED',
    'Order',
    orderId,
    { status: order.status },
    { status: newStatus }
  );

  await updateDailySummary(branchId);

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

export async function receivePayment(orderId: string, method: string, amount: number) {
  const session = await requireAuth();
  const { branchId, id: userId, organizationId } = session.user;

  const order = await prisma.order.findFirst({
    where: { id: orderId, branchId },
  });
  if (!order) throw new Error('Order tidak ditemukan');

  await prisma.payment.create({
    data: {
      orderId,
      branchId,
      amount,
      method: method as 'CASH' | 'QRIS' | 'BANK_TRANSFER',
      receivedById: userId,
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

  return { success: true };
}

export async function reportMachineTrouble(machineId: string, note: string) {
  const session = await requireAuth();
  const { branchId, id: userId, organizationId } = session.user;

  await prisma.machine.update({
    where: { id: machineId },
    data: { status: 'TROUBLE' },
  });

  await prisma.machineLog.create({
    data: {
      machineId,
      eventType: 'TROUBLE_REPORTED',
      reportedById: userId,
      note,
    },
  });

  await createAuditLog(
    { organizationId, branchId, userId },
    'MACHINE_TROUBLE_REPORTED',
    'Machine',
    machineId,
    null,
    { note }
  );

  revalidatePath('/worker');
  revalidatePath('/owner');
  revalidatePath('/owner/audit-trail');
}
