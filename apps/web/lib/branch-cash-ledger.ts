import { prisma } from '@aww/database';

function expenseNetAmount(row: { amount: number; discount?: number | null; netAmount?: number | null }) {
  if (row.netAmount != null && row.netAmount > 0) return row.netAmount;
  return Math.max(0, row.amount - (row.discount ?? 0));
}

/** Kas seharusnya = saldo opname terakhir + pembayaran tunai - pengeluaran tunai sejak opname disetujui. */
export async function computeExpectedBranchCash(branchId: string) {
  const lastApproved = await prisma.stockOpname.findFirst({
    where: { branchId, status: 'APPROVED', cashActual: { not: null } },
    orderBy: { approvedAt: 'desc' },
    select: { cashActual: true, approvedAt: true },
  });

  const openingBalance = lastApproved?.cashActual ?? 0;
  const since = lastApproved?.approvedAt ?? new Date(0);

  const [cashPayments, cashExpenses] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        branchId,
        method: 'CASH',
        status: 'PAID',
        paidAt: { gt: since },
      },
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: {
        branchId,
        paymentMethod: 'CASH',
        date: { gt: since },
      },
      select: { amount: true, discount: true, netAmount: true },
    }),
  ]);

  const payments = cashPayments._sum.amount ?? 0;
  const expenses = cashExpenses.reduce((sum, row) => sum + expenseNetAmount(row), 0);

  return Math.round(openingBalance + payments - expenses);
}

export async function getBranchCashSnapshot(branchIds: string[]) {
  if (branchIds.length === 0) {
    return { expectedCash: 0, actualCash: null as number | null, cashVariance: null as number | null };
  }

  const rows = await Promise.all(
    branchIds.map(async (branchId) => {
      const [expectedCash, lastApproved, activeOpname] = await Promise.all([
        computeExpectedBranchCash(branchId),
        prisma.stockOpname.findFirst({
          where: { branchId, status: 'APPROVED' },
          orderBy: { approvedAt: 'desc' },
          select: { cashActual: true, cashVariance: true },
        }),
        prisma.stockOpname.findFirst({
          where: { branchId, status: { in: ['DRAFT', 'COUNTING', 'PENDING_APPROVAL'] } },
          orderBy: { createdAt: 'desc' },
          select: { cashActual: true, cashVariance: true },
        }),
      ]);

      const actualCash = activeOpname?.cashActual ?? lastApproved?.cashActual ?? null;
      const cashVariance = activeOpname?.cashVariance ?? lastApproved?.cashVariance ?? null;

      return { expectedCash, actualCash, cashVariance };
    })
  );

  const expectedCash = rows.reduce((sum, row) => sum + row.expectedCash, 0);
  const hasActual = rows.some((row) => row.actualCash != null);
  const actualCash = hasActual
    ? rows.reduce((sum, row) => sum + (row.actualCash ?? 0), 0)
    : null;
  const hasVariance = rows.some((row) => row.cashVariance != null);
  const cashVariance = hasVariance
    ? rows.reduce((sum, row) => sum + (row.cashVariance ?? 0), 0)
    : null;

  return { expectedCash, actualCash, cashVariance };
}
