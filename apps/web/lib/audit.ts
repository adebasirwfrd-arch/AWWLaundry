import { prisma, AuditAction } from '@aww/database';

interface AuditContext {
  organizationId: string;
  branchId?: string;
  userId?: string;
}

export async function createAuditLog(
  ctx: AuditContext,
  action: AuditAction,
  entityType: string,
  entityId: string,
  oldValue?: unknown,
  newValue?: unknown
) {
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      userId: ctx.userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
    },
  });
}

export async function getBranchPrice(
  branchId: string,
  serviceTypeId: string
): Promise<number> {
  const branchPrice = await prisma.branchPricing.findUnique({
    where: { branchId_serviceTypeId: { branchId, serviceTypeId } },
  });
  if (branchPrice) return branchPrice.pricePerKg;

  const service = await prisma.serviceType.findUnique({
    where: { id: serviceTypeId },
  });
  return service?.pricePerKg ?? 0;
}

export async function updateDailySummary(branchId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [ordersIn, ordersReady, ordersPickedUp, payments, unpaidOrders, weightSum] =
    await Promise.all([
      prisma.order.count({
        where: { branchId, createdAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.order.count({
        where: { branchId, readyAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.order.count({
        where: { branchId, pickedUpAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.payment.aggregate({
        where: { branchId, paidAt: { gte: todayStart, lt: todayEnd } },
        _sum: { amount: true },
      }),
      prisma.order.aggregate({
        where: { branchId, paymentStatus: 'UNPAID' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { branchId, createdAt: { gte: todayStart, lt: todayEnd } },
        _sum: { weightKg: true },
      }),
    ]);

  const metrics = {
    ordersIn,
    ordersReady,
    ordersPickedUp,
    revenue: payments._sum.amount ?? 0,
    totalWeightIn: weightSum._sum.weightKg ?? 0,
    unpaidTotal: unpaidOrders._sum.total ?? 0,
  };

  await prisma.dailyBranchSummary.upsert({
    where: { branchId_date: { branchId, date: todayStart } },
    update: { metrics: JSON.stringify(metrics) },
    create: { branchId, date: todayStart, metrics: JSON.stringify(metrics) },
  });

  return metrics;
}
