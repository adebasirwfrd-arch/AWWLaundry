'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Loader2, Search, Smartphone, ImageIcon } from 'lucide-react';
import { listOwnerOrders } from '@/app/actions/owner-orders';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  formatCurrency,
  formatWeight,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@aww/shared';
import { PERIOD_LABELS, type DashboardPeriod } from '@/lib/date-buckets';
import {
  STATUS_GROUP_LABELS,
  PROGRESS_LABELS,
  ORDER_PAYMENT_LABELS,
  type OrderStatusGroup,
  type OrderProgressFilter,
  type OrderPaymentFilter,
  type OrderListFilters,
} from '@/lib/order-filters';

type OrderRow = Awaited<ReturnType<typeof listOwnerOrders>>['orders'][0];

export function OwnerOrdersList({
  initialOrders,
  branches,
  serviceTypes,
  showBranchFilter,
}: {
  initialOrders: OrderRow[];
  branches: Array<{ id: string; name: string }>;
  serviceTypes: Array<{ id: string; name: string }>;
  showBranchFilter: boolean;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [pending, startTransition] = useTransition();

  const [branchId, setBranchId] = useState('');
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [statusGroup, setStatusGroup] = useState<OrderStatusGroup>('ALL');
  const [progress, setProgress] = useState<OrderProgressFilter>('ALL');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentFilter>('ALL');
  const [search, setSearch] = useState('');

  function applyFilters(overrides: Partial<OrderListFilters> = {}) {
    const f: OrderListFilters = {
      branchId: (overrides.branchId ?? branchId) || undefined,
      period: overrides.period ?? period,
      statusGroup: overrides.statusGroup ?? statusGroup,
      progress: overrides.progress ?? progress,
      serviceTypeId: (overrides.serviceTypeId ?? serviceTypeId) || undefined,
      paymentMethod: overrides.paymentMethod ?? paymentMethod,
      search: (overrides.search ?? search) || undefined,
    };
    startTransition(async () => {
      const res = await listOwnerOrders(f);
      setOrders(res.orders);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Filter className="h-4 w-4 text-rainbow-cyan" />
          Filter Order
          {pending && <Loader2 className="h-4 w-4 animate-spin text-rainbow-cyan" />}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {showBranchFilter && (
            <FilterSelect
              label="Cabang"
              value={branchId}
              onChange={(v) => { setBranchId(v); applyFilters({ branchId: v || undefined }); }}
              options={[{ value: '', label: 'Semua Cabang' }, ...branches.map((b) => ({ value: b.id, label: b.name }))]}
            />
          )}
          <FilterSelect
            label="Periode"
            value={period}
            onChange={(v) => { const p = v as DashboardPeriod; setPeriod(p); applyFilters({ period: p }); }}
            options={(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map((k) => ({ value: k, label: PERIOD_LABELS[k] }))}
          />
          <FilterSelect
            label="Status"
            value={statusGroup}
            onChange={(v) => { const s = v as OrderStatusGroup; setStatusGroup(s); applyFilters({ statusGroup: s }); }}
            options={(Object.keys(STATUS_GROUP_LABELS) as OrderStatusGroup[]).map((k) => ({ value: k, label: STATUS_GROUP_LABELS[k] }))}
          />
          <FilterSelect
            label="Proses"
            value={progress}
            onChange={(v) => { const p = v as OrderProgressFilter; setProgress(p); applyFilters({ progress: p }); }}
            options={(Object.keys(PROGRESS_LABELS) as OrderProgressFilter[]).map((k) => ({ value: k, label: PROGRESS_LABELS[k] }))}
          />
          <FilterSelect
            label="Paket / Layanan"
            value={serviceTypeId}
            onChange={(v) => { setServiceTypeId(v); applyFilters({ serviceTypeId: v || undefined }); }}
            options={[{ value: '', label: 'Semua Paket' }, ...serviceTypes.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <FilterSelect
            label="Pembayaran"
            value={paymentMethod}
            onChange={(v) => { const p = v as OrderPaymentFilter; setPaymentMethod(p); applyFilters({ paymentMethod: p }); }}
            options={(Object.keys(ORDER_PAYMENT_LABELS) as OrderPaymentFilter[]).map((k) => ({ value: k, label: ORDER_PAYMENT_LABELS[k] }))}
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">Cari</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/35" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="No. order, nama, telepon..."
                className="h-10 w-full rounded-xl border border-brand-navy/15 pl-9 pr-3 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-aww-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-brand-navy/10 bg-brand-sky/5 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-navy/50">
                <th className="px-4 py-3">No. Order</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Cabang</th>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Paket</th>
                <th className="px-4 py-3">Berat</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Bayar</th>
                <th className="px-4 py-3">Proses</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-brand-navy/45">
                    Tidak ada order sesuai filter
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className="cursor-pointer border-b border-brand-navy/5 transition-colors hover:bg-brand-sky/8"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-brand-navy">{o.orderNumber}</span>
                      {o.fromApp && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-rainbow-purple/10 px-1.5 py-0.5 text-[10px] font-semibold text-rainbow-purple">
                          <Smartphone className="h-3 w-3" /> App
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-navy/65 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-brand-navy/75">{o.branchName}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-navy">{o.customerName}</p>
                      <p className="text-xs text-brand-navy/45">{o.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-navy/75">{o.serviceName}</td>
                    <td className="px-4 py-3">{o.weightKg > 0 ? formatWeight(o.weightKg) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-brand-orange">{formatCurrency(o.total)}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3">
                      {o.paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rainbow-green">
                          {PAYMENT_METHOD_LABELS[o.paymentMethod ?? ''] ?? o.paymentMethod}
                          {o.hasProof && <ImageIcon className="h-3.5 w-3.5" />}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">Belum bayar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-navy/60">
                      {ORDER_STATUS_LABELS[o.status] ?? o.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-brand-navy/10 px-4 py-2 text-xs text-brand-navy/40">
          {orders.length} order · klik baris untuk detail
        </p>
      </div>
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
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
