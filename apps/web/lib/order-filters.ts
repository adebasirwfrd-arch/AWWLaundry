import type { DashboardPeriod } from '@/lib/date-buckets';
import { periodRange } from '@/lib/date-buckets';

export type OrderStatusGroup = 'ALL' | 'masuk' | 'progress' | 'selesai' | 'diambil';
export type OrderProgressFilter = 'ALL' | 'WASHING' | 'DRYING' | 'IRONING' | 'FOLDING';
export type OrderPaymentFilter = 'ALL' | 'UNPAID' | 'CASH' | 'BANK_TRANSFER' | 'QRIS';

export const STATUS_GROUP_LABELS: Record<OrderStatusGroup, string> = {
  ALL: 'Semua Status',
  masuk: 'Masuk',
  progress: 'Dalam Proses',
  selesai: 'Selesai',
  diambil: 'Diambil',
};

export const PROGRESS_LABELS: Record<OrderProgressFilter, string> = {
  ALL: 'Semua Proses',
  WASHING: 'Cuci',
  DRYING: 'Jemur',
  IRONING: 'Setrika',
  FOLDING: 'Lipat',
};

export const ORDER_PAYMENT_LABELS: Record<OrderPaymentFilter, string> = {
  ALL: 'Semua Pembayaran',
  UNPAID: 'Belum Bayar',
  CASH: 'Tunai',
  BANK_TRANSFER: 'Transfer',
  QRIS: 'QRIS',
};

const STATUS_GROUPS: Record<Exclude<OrderStatusGroup, 'ALL'>, string[]> = {
  masuk: ['ON_HOLD', 'RECEIVED'],
  progress: ['WASHING', 'DRYING', 'IRONING', 'FOLDING'],
  selesai: ['READY'],
  diambil: ['PICKED_UP', 'DELIVERED'],
};

export interface OrderListFilters {
  branchId?: string;
  period: DashboardPeriod;
  statusGroup: OrderStatusGroup;
  progress: OrderProgressFilter;
  serviceTypeId?: string;
  paymentMethod: OrderPaymentFilter;
  search?: string;
}

export function buildOrderListWhere(
  filters: OrderListFilters,
  organizationId: string,
  managerBranchId?: string
) {
  const range = periodRange(filters.period);
  const where: Record<string, unknown> = {
    branch: { organizationId },
    createdAt: { gte: range.start, lte: range.end },
  };

  /** Kasir & manager hanya lihat cabang sendiri — abaikan filter cabang dari client. */
  if (managerBranchId) {
    where.branchId = managerBranchId;
  } else if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  const statuses: string[] = [];
  if (filters.statusGroup !== 'ALL') {
    statuses.push(...STATUS_GROUPS[filters.statusGroup]);
  }
  if (filters.progress !== 'ALL') {
    if (statuses.length > 0) {
      const progressOnly = statuses.filter((s) => s === filters.progress);
      where.status = { in: progressOnly.length > 0 ? progressOnly : [filters.progress] };
    } else {
      where.status = filters.progress;
    }
  } else if (statuses.length > 0) {
    where.status = { in: statuses };
  }

  if (filters.serviceTypeId) {
    where.serviceTypeId = filters.serviceTypeId;
  }

  if (filters.paymentMethod === 'UNPAID') {
    where.paymentStatus = 'UNPAID';
  } else if (filters.paymentMethod !== 'ALL') {
    where.payments = { some: { method: filters.paymentMethod } };
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { orderNumber: { contains: q } },
      { customer: { name: { contains: q } } },
      { customer: { phone: { contains: q } } },
    ];
  }

  return where;
}
