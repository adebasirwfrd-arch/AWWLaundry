import { prisma } from '@aww/database';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '@aww/shared';
import { fetchCashflowOverview, type CashflowFilters } from '@/lib/cashflow-analytics';
import { periodRange } from '@/lib/date-buckets';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PAID: 'Lunas',
  UNPAID: 'Belum bayar',
  PARTIAL: 'Sebagian',
  REFUNDED: 'Refund',
};

export async function fetchOrdersForReport(
  organizationId: string,
  range: { start: Date; end: Date }
) {
  const orders = await prisma.order.findMany({
    where: {
      branch: { organizationId },
      createdAt: { gte: range.start, lte: range.end },
    },
    include: {
      branch: { select: { name: true, code: true } },
      customer: { select: { name: true, phone: true } },
      serviceType: { select: { name: true } },
      payments: {
        orderBy: { paidAt: 'desc' },
        take: 1,
        select: { method: true, amount: true, paidAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const statusMap = new Map<string, number>();
  let paidCount = 0;
  let unpaidCount = 0;
  let totalRevenue = 0;

  const rows = orders.map((o) => {
    statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
    if (o.paymentStatus === 'PAID') {
      paidCount += 1;
      totalRevenue += o.total;
    } else {
      unpaidCount += 1;
    }
    const payment = o.payments[0];
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      branchName: o.branch.name,
      branchCode: o.branch.code,
      customerName: o.customer.name,
      customerPhone: o.customer.phone,
      serviceName: o.serviceType.name,
      weightKg: o.weightKg,
      subtotal: o.subtotal,
      discount: o.discount,
      total: o.total,
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
      paymentStatus: o.paymentStatus,
      paymentStatusLabel: PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus,
      paymentMethod: payment?.method ?? null,
      paymentMethodLabel: payment?.method
        ? (PAYMENT_METHOD_LABELS[payment.method] ?? payment.method)
        : null,
      paidAt: payment?.paidAt?.toISOString() ?? null,
      fromApp: o.fromApp,
    };
  });

  return {
    summary: {
      total: orders.length,
      paidCount,
      unpaidCount,
      totalRevenue,
      byStatus: [...statusMap.entries()].map(([status, count]) => ({
        status,
        label: ORDER_STATUS_LABELS[status] ?? status,
        count,
      })),
    },
    orders: rows,
  };
}

export async function fetchStockForReport(
  organizationId: string,
  range: { start: Date; end: Date }
) {
  const [items, movements, opnames] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { branch: { organizationId } },
      include: { branch: { select: { name: true, code: true } } },
      orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.stockMovement.findMany({
      where: {
        item: { branch: { organizationId } },
        createdAt: { gte: range.start, lte: range.end },
      },
      include: {
        item: {
          select: {
            name: true,
            unit: true,
            sku: true,
            branch: { select: { name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockOpname.findMany({
      where: {
        branch: { organizationId },
        OR: [
          { createdAt: { gte: range.start, lte: range.end } },
          { approvedAt: { gte: range.start, lte: range.end } },
        ],
      },
      include: {
        branch: { select: { name: true, code: true } },
        lines: {
          include: { item: { select: { name: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;

  return {
    summary: {
      itemCount: items.length,
      lowStockCount,
      movementCount: movements.length,
      opnameCount: opnames.length,
    },
    inventory: items.map((i) => ({
      id: i.id,
      branchName: i.branch.name,
      branchCode: i.branch.code,
      sku: i.sku,
      name: i.name,
      category: i.category,
      unit: i.unit,
      unitCost: i.unitCost,
      currentStock: i.currentStock,
      minStock: i.minStock,
      stockValue: i.currentStock * i.unitCost,
      isLow: i.currentStock <= i.minStock,
      lastCountedAt: i.lastCountedAt?.toISOString() ?? null,
    })),
    movements: movements.map((m) => ({
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      branchName: m.item.branch.name,
      itemName: m.item.name,
      sku: m.item.sku,
      unit: m.item.unit,
      type: m.type,
      qty: m.qty,
      reference: m.reference,
    })),
    opnames: opnames.map((o) => {
      const totalVarianceCost = o.lines.reduce((s, l) => s + (l.varianceCost ?? 0), 0);
      const totalVarianceQty = o.lines.reduce((s, l) => s + Math.abs(l.variance), 0);
      return {
        id: o.id,
        branchName: o.branch.name,
        branchCode: o.branch.code,
        period: o.period.toISOString(),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        approvedAt: o.approvedAt?.toISOString() ?? null,
        cashExpected: o.cashExpected,
        cashActual: o.cashActual,
        cashVariance: o.cashVariance,
        lineCount: o.lines.length,
        totalVarianceQty,
        totalVarianceCost,
        notes: o.notes,
        lines: o.lines.map((l) => ({
          itemName: l.item.name,
          unit: l.item.unit,
          systemQty: l.systemQty,
          physicalQty: l.physicalQty,
          variance: l.variance,
          varianceCost: l.varianceCost ?? 0,
        })),
      };
    }),
  };
}

export async function fetchFullOperationalReport(filters: CashflowFilters) {
  const range = filters.dateRange ?? periodRange(filters.period ?? 'month');
  const [cashflow, orders, stock] = await Promise.all([
    fetchCashflowOverview(filters),
    fetchOrdersForReport(filters.organizationId, range),
    fetchStockForReport(filters.organizationId, range),
  ]);

  return { ...cashflow, orders, stock };
}

export type OperationalReportData = Awaited<ReturnType<typeof fetchFullOperationalReport>>;
