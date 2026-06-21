'use client';

import { useState, useTransition } from 'react';
import { Filter, Loader2, Search, ScrollText, User, Building2 } from 'lucide-react';
import { AuditAction } from '@aww/database';
import { listAuditTrail, type AuditTrailPeriod, type AuditTrailRow, type AuditStaffRole } from '@/app/actions/audit-trail';
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_OPTIONS } from '@/lib/audit-labels';

const PERIOD_LABELS: Record<AuditTrailPeriod, string> = {
  today: 'Hari Ini',
  week: '7 Hari',
  month: 'Bulan Ini',
  all: 'Semua',
};

const ROLE_FILTER_LABELS: Record<AuditStaffRole, string> = {
  ALL: 'Kasir & Pekerja',
  CASHIER: 'Kasir',
  WORKER: 'Pekerja',
};

function actionBadgeClass(action: AuditAction): string {
  if (action.startsWith('ORDER')) return 'bg-sky-100 text-sky-800';
  if (action.startsWith('PAYMENT')) return 'bg-emerald-100 text-emerald-800';
  if (action.startsWith('STOCK') || action.startsWith('EXPENSE')) return 'bg-amber-100 text-amber-900';
  if (action.startsWith('MACHINE')) return 'bg-red-100 text-red-700';
  return 'bg-brand-navy/10 text-brand-navy';
}

export function AuditTrailClient({
  initialRows,
  branches,
  initialCursor,
}: {
  initialRows: AuditTrailRow[];
  branches: Array<{ id: string; name: string; code: string }>;
  initialCursor: string | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  const [branchId, setBranchId] = useState('');
  const [staffRole, setStaffRole] = useState<AuditStaffRole>('ALL');
  const [action, setAction] = useState<AuditAction | 'ALL'>('ALL');
  const [period, setPeriod] = useState<AuditTrailPeriod>('month');
  const [search, setSearch] = useState('');

  function reload(overrides: Partial<{
    branchId: string;
    staffRole: AuditStaffRole;
    action: AuditAction | 'ALL';
    period: AuditTrailPeriod;
    search: string;
  }> = {}) {
    startTransition(async () => {
      const res = await listAuditTrail({
        branchId: (overrides.branchId ?? branchId) || undefined,
        staffRole: overrides.staffRole ?? staffRole,
        action: overrides.action ?? action,
        period: overrides.period ?? period,
        search: (overrides.search ?? search) || undefined,
      });
      setRows(res.rows);
      setNextCursor(res.nextCursor);
    });
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await listAuditTrail({
        branchId: branchId || undefined,
        staffRole,
        action,
        period,
        search: search || undefined,
        cursor: nextCursor,
      });
      setRows((prev) => [...prev, ...res.rows]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Filter className="h-4 w-4 text-rainbow-cyan" />
          Filter Audit Trail
          {pending && <Loader2 className="h-4 w-4 animate-spin text-rainbow-cyan" />}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Cabang"
            value={branchId}
            onChange={(v) => { setBranchId(v); reload({ branchId: v }); }}
            options={[
              { value: '', label: 'Semua Cabang' },
              ...branches.map((b) => ({ value: b.id, label: b.name })),
            ]}
          />
          <FilterSelect
            label="Peran Staff"
            value={staffRole}
            onChange={(v) => { const role = v as AuditStaffRole; setStaffRole(role); reload({ staffRole: role }); }}
            options={(Object.keys(ROLE_FILTER_LABELS) as AuditStaffRole[]).map((k) => ({
              value: k,
              label: ROLE_FILTER_LABELS[k],
            }))}
          />
          <FilterSelect
            label="Aksi"
            value={action}
            onChange={(v) => { const a = v as AuditAction | 'ALL'; setAction(a); reload({ action: a }); }}
            options={[
              { value: 'ALL', label: 'Semua Aksi' },
              ...AUDIT_ACTION_OPTIONS.map((k) => ({ value: k, label: AUDIT_ACTION_LABELS[k] })),
            ]}
          />
          <FilterSelect
            label="Periode"
            value={period}
            onChange={(v) => { const p = v as AuditTrailPeriod; setPeriod(p); reload({ period: p }); }}
            options={(Object.keys(PERIOD_LABELS) as AuditTrailPeriod[]).map((k) => ({
              value: k,
              label: PERIOD_LABELS[k],
            }))}
          />
        </div>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/35" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && reload()}
            placeholder="Cari nama staff, cabang, order, atau detail..."
            className="h-10 w-full rounded-xl border border-brand-navy/15 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-brand-navy/10 bg-white shadow-aww-sm">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-brand-navy/55">
            <ScrollText className="mx-auto mb-3 h-10 w-10 text-brand-navy/25" />
            <p>Belum ada aktivitas kasir atau pekerja pada filter ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-brand-navy/8">
            {rows.map((row) => (
              <article key={row.id} className="px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${actionBadgeClass(row.action)}`}>
                        {row.actionLabel}
                      </span>
                      <span className="text-xs text-brand-navy/45">{row.entityType}</span>
                    </div>
                    <p className="mt-1 font-medium text-brand-navy">{row.summary}</p>
                    {row.details && (
                      <div className="mt-3 grid gap-2 rounded-xl border border-brand-navy/8 bg-brand-sky/5 p-3 text-xs sm:grid-cols-2">
                        {row.details.transactionNumber && (
                          <AuditDetailItem label="No. Transaksi" value={row.details.transactionNumber} mono />
                        )}
                        {row.details.transactionMethod && (
                          <AuditDetailItem label="Metode Transaksi" value={row.details.transactionMethod} />
                        )}
                        <AuditDetailItem label="Jenis Transaksi" value={row.details.transactionType} />
                        {row.details.transactionAmountLabel && (
                          <AuditDetailItem label="Jumlah Transaksi" value={row.details.transactionAmountLabel} />
                        )}
                        <AuditDetailItem
                          label="Detail Aktivitas"
                          value={row.details.activityDetail}
                          className="sm:col-span-2"
                        />
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-navy/55">
                      {row.user && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {row.user.name}
                          <span className="text-brand-navy/35">· {row.user.roleLabel}</span>
                        </span>
                      )}
                      {row.branch && (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {row.branch.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <time className="shrink-0 text-xs text-brand-navy/45">
                    {new Date(row.createdAt).toLocaleString('id-ID')}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}

        {nextCursor && (
          <div className="border-t border-brand-navy/8 p-4 text-center">
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="rounded-xl border border-brand-navy/15 px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 disabled:opacity-60"
            >
              {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AuditDetailItem({
  label,
  value,
  mono = false,
  className = '',
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-navy/45">{label}</p>
      <p className={`mt-0.5 text-brand-navy/80 ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
