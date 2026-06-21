import { AuditAction, Role } from '@aww/database';
import { formatCurrency, PAYMENT_METHOD_LABELS, ROLE_LABELS } from '@aww/shared';

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  ORDER_CREATED: 'Order dibuat',
  ORDER_STATUS_CHANGED: 'Status order diubah',
  ORDER_CANCELLED: 'Order dibatalkan',
  PAYMENT_RECEIVED: 'Pembayaran diterima',
  PAYMENT_REFUNDED: 'Pembayaran direfund',
  PRICE_OVERRIDE: 'Harga diubah',
  DISCOUNT_APPLIED: 'Diskon diterapkan',
  USER_LOGIN: 'Login',
  USER_LOGOUT: 'Logout',
  PERMISSION_CHANGED: 'Izin diubah',
  MACHINE_TROUBLE_REPORTED: 'Mesin bermasalah',
  MACHINE_RESOLVED: 'Mesin diperbaiki',
  STOCK_OPNAME_CREATED: 'Stock opname',
  STOCK_ADJUSTED: 'Stok disesuaikan',
  EXPENSE_CREATED: 'Pengeluaran dicatat',
  EXPENSE_DELETED: 'Pengeluaran dihapus',
  SETTINGS_CHANGED: 'Pengaturan diubah',
  REPORT_GENERATED: 'Laporan dibuat',
};

export const AUDIT_ACTION_OPTIONS: AuditAction[] = [
  'ORDER_CREATED',
  'ORDER_STATUS_CHANGED',
  'ORDER_CANCELLED',
  'PAYMENT_RECEIVED',
  'MACHINE_TROUBLE_REPORTED',
  'STOCK_OPNAME_CREATED',
  'STOCK_ADJUSTED',
  'EXPENSE_CREATED',
  'EXPENSE_DELETED',
];

const AUDIT_TRANSACTION_TYPE_LABELS: Record<AuditAction, string> = {
  ORDER_CREATED: 'Pembuatan order',
  ORDER_STATUS_CHANGED: 'Perubahan status order',
  ORDER_CANCELLED: 'Pembatalan order',
  PAYMENT_RECEIVED: 'Pembayaran',
  PAYMENT_REFUNDED: 'Refund pembayaran',
  PRICE_OVERRIDE: 'Override harga',
  DISCOUNT_APPLIED: 'Diskon',
  USER_LOGIN: 'Autentikasi',
  USER_LOGOUT: 'Autentikasi',
  PERMISSION_CHANGED: 'Perubahan izin',
  MACHINE_TROUBLE_REPORTED: 'Gangguan mesin',
  MACHINE_RESOLVED: 'Perbaikan mesin',
  STOCK_OPNAME_CREATED: 'Stock opname',
  STOCK_ADJUSTED: 'Penyesuaian stok',
  EXPENSE_CREATED: 'Pengeluaran operasional',
  EXPENSE_DELETED: 'Penghapusan pengeluaran',
  SETTINGS_CHANGED: 'Perubahan pengaturan',
  REPORT_GENERATED: 'Laporan',
};

export interface AuditActivityDetails {
  transactionNumber: string | null;
  transactionMethod: string | null;
  transactionType: string;
  transactionAmount: number | null;
  transactionAmountLabel: string | null;
  activityDetail: string;
}

export interface AuditOrderLookup {
  orderNumber?: string | null;
  total?: number | null;
}

function parseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function formatPaymentMethod(method: unknown): string {
  if (!method) return '—';
  const key = String(method);
  return PAYMENT_METHOD_LABELS[key] ?? key;
}

function resolvePaymentMethodLabel(next: Record<string, unknown> | null): string | null {
  if (!next) return null;

  if (Array.isArray(next.payments) && next.payments.length > 0) {
    const payments = next.payments as Array<{ method?: string; label?: string }>;
    const methods = [...new Set(payments.map((p) => formatPaymentMethod(p.method)).filter(Boolean))];
    if (methods.length > 1) return `Kombinasi (${methods.join(' · ')})`;
    return methods[0] ?? null;
  }

  if (next.combinationPayment) return 'Kombinasi (DP)';

  const method = next.paymentMethod ?? next.method;
  if (method) return formatPaymentMethod(method);

  return null;
}

function extractPaymentAmount(next: Record<string, unknown> | null): number | null {
  if (!next) return null;

  if (Array.isArray(next.payments) && next.payments.length > 0) {
    const payments = next.payments as Array<{ amount?: number | string }>;
    const total = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
    return Number.isFinite(total) ? total : null;
  }

  const amount = next.amount ?? next.total;
  if (amount == null) return null;
  const num = Number(amount);
  return Number.isFinite(num) ? num : null;
}

function formatPaymentBreakdown(next: Record<string, unknown> | null): string | null {
  if (!next) return null;

  if (Array.isArray(next.payments) && next.payments.length > 0) {
    const payments = next.payments as Array<{ amount?: number | string; method?: string; label?: string }>;
    return payments
      .map((p) => {
        const label = p.label ? `${p.label} ` : '';
        return `${label}${formatPaymentMethod(p.method)} ${formatCurrency(Number(p.amount ?? 0))}`;
      })
      .join(' · ');
  }

  if (next.amount != null && next.method) {
    return `${formatPaymentMethod(next.method)} ${formatCurrency(Number(next.amount))}`;
  }

  return null;
}

function resolveOrderNumber(
  next: Record<string, unknown> | null,
  entityType: string,
  entityId: string,
  orderLookup?: AuditOrderLookup | null
): string | null {
  if (next?.orderNumber) return String(next.orderNumber);
  if (entityType === 'Order' || entityType === 'Payment') {
    return orderLookup?.orderNumber ?? null;
  }
  return null;
}

function resolveTransactionAmount(
  action: AuditAction,
  next: Record<string, unknown> | null,
  orderLookup?: AuditOrderLookup | null
): number | null {
  if (action === 'PAYMENT_RECEIVED' || action === 'PAYMENT_REFUNDED') {
    return extractPaymentAmount(next);
  }

  if (next?.total != null) {
    const num = Number(next.total);
    return Number.isFinite(num) ? num : null;
  }

  if (next?.amount != null) {
    const num = Number(next.amount);
    return Number.isFinite(num) ? num : null;
  }

  if (orderLookup?.total != null) {
    const num = Number(orderLookup.total);
    return Number.isFinite(num) ? num : null;
  }

  return null;
}

function buildActivityDetail(
  action: AuditAction,
  entityType: string,
  prev: Record<string, unknown> | null,
  next: Record<string, unknown> | null,
  orderLookup?: AuditOrderLookup | null
): string {
  const orderNumber = resolveOrderNumber(next, entityType, '', orderLookup);
  const orderPart = orderNumber ? `Order ${orderNumber}` : null;

  switch (action) {
    case 'ORDER_CREATED': {
      const parts = [orderPart ?? 'Order baru'];
      if (next?.weightKg != null) parts.push(`${String(next.weightKg)} kg`);
      if (next?.total != null) parts.push(`Total ${formatCurrency(Number(next.total))}`);
      return parts.join(' · ');
    }
    case 'ORDER_STATUS_CHANGED': {
      const parts = [`${String(prev?.status ?? '—')} → ${String(next?.status ?? '—')}`];
      if (orderPart) parts.push(orderPart);
      const method = resolvePaymentMethodLabel(next);
      if (method) parts.push(`Metode ${method}`);
      if (next?.paymentStatus) parts.push(`Status bayar ${String(next.paymentStatus)}`);
      if (next?.weightKg != null) parts.push(`${String(next.weightKg)} kg`);
      if (next?.total != null) parts.push(`Total ${formatCurrency(Number(next.total))}`);
      return parts.join(' · ');
    }
    case 'ORDER_CANCELLED': {
      const parts = [orderPart ?? 'Pesanan dibatalkan'];
      if (next?.reason) parts.push(String(next.reason));
      return parts.join(' · ');
    }
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_REFUNDED': {
      const parts: string[] = [];
      if (orderPart) parts.push(orderPart);
      const breakdown = formatPaymentBreakdown(next);
      if (breakdown) parts.push(breakdown);
      if (next?.paymentStatus) parts.push(`Status ${String(next.paymentStatus)}`);
      return parts.length > 0 ? parts.join(' · ') : 'Pembayaran tercatat';
    }
    case 'STOCK_ADJUSTED': {
      if (next?.action === 'created') return `Item baru: ${String(next.name ?? entityType)}`;
      if (next?.type && next?.qty != null) {
        return `${String(next.type)} ${String(next.qty)} · stok ${String(prev?.stock ?? '?')} → ${String(next.stock ?? '?')}`;
      }
      if (next?.variance != null) {
        return `Selisih opname ${String(next.variance)} · stok ${String(prev?.stock ?? '?')} → ${String(next.stock ?? '?')}`;
      }
      return 'Penyesuaian stok';
    }
    case 'STOCK_OPNAME_CREATED':
      if (next?.lineCount != null) return `Mulai opname · ${String(next.lineCount)} item`;
      return `${String(prev?.status ?? '—')} → ${String(next?.status ?? '—')}`;
    case 'EXPENSE_CREATED':
      return `${String(next?.type ?? 'Pengeluaran')} · ${formatCurrency(Number(next?.amount ?? 0))} · ${String(next?.category ?? next?.title ?? '')}`;
    case 'EXPENSE_DELETED':
      return String(next?.title ?? next?.category ?? 'Pengeluaran dihapus');
    case 'MACHINE_TROUBLE_REPORTED':
      return [next?.machineName ? String(next.machineName) : null, next?.note ? String(next.note) : 'Laporan gangguan mesin']
        .filter(Boolean)
        .join(' · ');
    case 'MACHINE_RESOLVED':
      return [next?.machineName ? String(next.machineName) : null, next?.note ? String(next.note) : 'Mesin kembali normal']
        .filter(Boolean)
        .join(' · ');
    default:
      if (next && Object.keys(next).length > 0) {
        return Object.entries(next)
          .slice(0, 4)
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(' · ');
      }
      return entityType;
  }
}

export function buildAuditActivityDetails(
  action: AuditAction,
  entityType: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
  orderLookup?: AuditOrderLookup | null
): AuditActivityDetails {
  const prev = asRecord(oldValue);
  const next = asRecord(newValue);
  const transactionNumber = resolveOrderNumber(next, entityType, entityId, orderLookup);
  const transactionMethod = resolvePaymentMethodLabel(next);
  const transactionType = AUDIT_TRANSACTION_TYPE_LABELS[action];
  const transactionAmount = resolveTransactionAmount(action, next, orderLookup);

  return {
    transactionNumber,
    transactionMethod,
    transactionType,
    transactionAmount,
    transactionAmountLabel: transactionAmount != null ? formatCurrency(transactionAmount) : null,
    activityDetail: buildActivityDetail(action, entityType, prev, next, orderLookup),
  };
}

export function summarizeAuditChange(
  action: AuditAction,
  entityType: string,
  oldValue: unknown,
  newValue: unknown,
  orderLookup?: AuditOrderLookup | null
): string {
  const next = asRecord(newValue);
  const prev = asRecord(oldValue);
  const orderNumber = resolveOrderNumber(next, entityType, '', orderLookup);
  const orderSuffix = orderNumber ? ` · ${orderNumber}` : '';

  switch (action) {
    case 'ORDER_CREATED':
      return next?.orderNumber
        ? `Order ${String(next.orderNumber)}`
        : `Order baru · ${formatCurrency(Number(next?.total ?? 0))}`;
    case 'ORDER_STATUS_CHANGED':
      return `${String(prev?.status ?? '—')} → ${String(next?.status ?? '—')}${orderSuffix}`;
    case 'ORDER_CANCELLED':
      return next?.orderNumber
        ? `Order ${String(next.orderNumber)}${next.reason ? ` · ${String(next.reason)}` : ''}`
        : next?.reason
          ? String(next.reason)
          : 'Pesanan dibatalkan';
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_REFUNDED': {
      const amount = extractPaymentAmount(next) ?? 0;
      const method = resolvePaymentMethodLabel(next) ?? '—';
      return `${formatCurrency(amount)} · ${method}${orderSuffix}`;
    }
    case 'STOCK_ADJUSTED': {
      if (next?.action === 'created') return `Item baru: ${String(next.name ?? entityType)}`;
      if (next?.type && next?.qty != null) {
        return `${String(next.type)} ${String(next.qty)} · stok ${String(prev?.stock ?? '?')} → ${String(next.stock ?? '?')}`;
      }
      if (next?.variance != null) {
        return `Selisih opname ${String(next.variance)} · stok ${String(prev?.stock ?? '?')} → ${String(next.stock ?? '?')}`;
      }
      return 'Penyesuaian stok';
    }
    case 'STOCK_OPNAME_CREATED':
      if (next?.lineCount != null) return `Mulai opname · ${String(next.lineCount)} item`;
      return `${String(prev?.status ?? '—')} → ${String(next?.status ?? '—')}`;
    case 'EXPENSE_CREATED':
      return `${String(next?.type ?? 'Pengeluaran')} · ${formatCurrency(Number(next?.amount ?? 0))} · ${String(next?.category ?? next?.title ?? '')}`;
    case 'EXPENSE_DELETED':
      return String(next?.title ?? next?.category ?? 'Pengeluaran dihapus');
    case 'MACHINE_TROUBLE_REPORTED':
      return String(next?.note ?? 'Laporan gangguan mesin');
    case 'MACHINE_RESOLVED':
      return String(next?.note ?? 'Mesin kembali normal');
    default:
      if (next && Object.keys(next).length > 0) {
        const parts = Object.entries(next)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${String(v)}`);
        return parts.join(' · ');
      }
      return entityType;
  }
}

export function resolveStaffRoleLabel(
  branchRoles: Array<{ role: Role; branchId: string }>,
  branchId?: string | null
): string {
  const match = branchId ? branchRoles.find((r) => r.branchId === branchId) : branchRoles[0];
  return ROLE_LABELS[match?.role ?? ''] ?? 'Staff';
}

export function formatAuditRow(
  input: {
    id: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: Date;
    branch: { id: string; name: string; code: string } | null;
    user: {
      id: string;
      name: string;
      email: string;
      branchRoles: Array<{ role: Role; branchId: string }>;
    } | null;
  },
  orderLookup?: AuditOrderLookup | null
) {
  const oldParsed = parseJson(input.oldValue);
  const newParsed = parseJson(input.newValue);
  const details = buildAuditActivityDetails(
    input.action,
    input.entityType,
    input.entityId,
    oldParsed,
    newParsed,
    orderLookup
  );

  return {
    id: input.id,
    action: input.action,
    actionLabel: AUDIT_ACTION_LABELS[input.action],
    entityType: input.entityType,
    entityId: input.entityId,
    summary: summarizeAuditChange(input.action, input.entityType, oldParsed, newParsed, orderLookup),
    details,
    oldValue: oldParsed,
    newValue: newParsed,
    createdAt: input.createdAt.toISOString(),
    branch: input.branch,
    user: input.user
      ? {
          id: input.user.id,
          name: input.user.name,
          email: input.user.email,
          roleLabel: resolveStaffRoleLabel(input.user.branchRoles, input.branch?.id),
        }
      : null,
  };
}
