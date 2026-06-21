'use server';

import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import {
  buildOrderListWhere,
  type OrderListFilters,
} from '@/lib/order-filters';
import { resolveOrderPaymentProofs } from '@/lib/payment-proof-url';
import { resolveTransferBankDetails } from '@/lib/branch-payment-settings';
import { hasOrgWideBranchAccess } from '@/lib/branch-access';

const VIEW_ROLES = [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER];

export async function listOwnerOrders(filters: OrderListFilters) {
  const session = await requireAuth(VIEW_ROLES);
  const lockedBranchId =
    session.user.role === Role.MANAGER || session.user.role === Role.CASHIER
      ? session.user.branchId
      : undefined;

  const where = buildOrderListWhere(
    filters,
    session.user.organizationId,
    lockedBranchId
  );

  const [orders, branches, serviceTypes] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        serviceType: { select: { name: true } },
        branch: { select: { name: true, code: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 1, select: { method: true, amount: true, proofUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }),
    prisma.branch.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.serviceType.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      branchName: o.branch.name,
      branchCode: o.branch.code,
      customerName: o.customer.name,
      customerPhone: o.customer.phone,
      serviceName: o.serviceType.name,
      weightKg: o.weightKg,
      total: o.total,
      discount: o.discount,
      status: o.status,
      paymentStatus: o.paymentStatus,
      fromApp: o.fromApp,
      paymentMethod: o.payments[0]?.method ?? null,
      paymentAmount: o.payments[0]?.amount ?? null,
      hasProof: !!o.payments[0]?.proofUrl,
    })),
    branches,
    serviceTypes,
  };
}

export async function getOrderDetailForStaff(orderId: string) {
  const session = await requireAuth([
    Role.OWNER,
    Role.SUPER_ADMIN,
    Role.MANAGER,
    Role.CASHIER,
    Role.WORKER,
  ]);

  const isOrgWide = hasOrgWideBranchAccess(session.user.role);

  const order = await prisma.order.findFirst({
    where: isOrgWide
      ? { id: orderId, branch: { organizationId: session.user.organizationId } }
      : { id: orderId, branchId: session.user.branchId },
    include: {
      customer: true,
      serviceType: true,
      branch: { select: { name: true, phone: true, code: true, settings: true } },
      items: true,
      payments: {
        orderBy: { paidAt: 'desc' },
        include: { receivedBy: { select: { name: true } } },
      },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { name: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });

  if (!order) return null;

  const payments = await resolveOrderPaymentProofs(
    order.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      paidAt: p.paidAt.toISOString(),
      proofUrl: p.proofUrl,
      receivedBy: p.receivedBy.name,
    })),
    order.notes
  );

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    weightKg: order.weightKg,
    total: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    fromApp: order.fromApp,
    notes: order.notes,
    estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? null,
    readyAt: order.readyAt?.toISOString() ?? null,
    pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    customer: { name: order.customer.name, phone: order.customer.phone, email: order.customer.email },
    serviceName: order.serviceType.name,
    branchName: order.branch.name,
    branchCode: order.branch.code,
    branchPhone: order.branch.phone,
    bankDetails: resolveTransferBankDetails(order.branch.settings),
    createdBy: order.createdBy.name,
    items: order.items.map((i) => ({
      description: i.description,
      qty: i.qty,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    payments,
    statusLogs: order.statusLogs.map((l) => ({
      toStatus: l.toStatus,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
      changedBy: l.changedBy.name,
    })),
  };
}
