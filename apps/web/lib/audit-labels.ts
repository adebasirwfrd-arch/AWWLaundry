import { AuditAction, Role } from '@aww/database';
import { formatCurrency, ROLE_LABELS } from '@aww/shared';

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

export function summarizeAuditChange(
  action: AuditAction,
  entityType: string,
  oldValue: unknown,
  newValue: unknown
): string {
  const next = asRecord(newValue);
  const prev = asRecord(oldValue);

  switch (action) {
    case 'ORDER_CREATED':
      return next?.orderNumber
        ? `Order ${String(next.orderNumber)}`
        : `Order baru · ${formatCurrency(Number(next?.total ?? 0))}`;
    case 'ORDER_STATUS_CHANGED':
      return `${String(prev?.status ?? '—')} → ${String(next?.status ?? '—')}`;
    case 'ORDER_CANCELLED':
      return next?.reason ? String(next.reason) : 'Pesanan dibatalkan';
    case 'PAYMENT_RECEIVED':
      return `${formatCurrency(Number(next?.amount ?? 0))} · ${String(next?.method ?? '—')}`;
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

export function formatAuditRow(input: {
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
}) {
  const oldParsed = parseJson(input.oldValue);
  const newParsed = parseJson(input.newValue);

  return {
    id: input.id,
    action: input.action,
    actionLabel: AUDIT_ACTION_LABELS[input.action],
    entityType: input.entityType,
    entityId: input.entityId,
    summary: summarizeAuditChange(input.action, input.entityType, oldParsed, newParsed),
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
