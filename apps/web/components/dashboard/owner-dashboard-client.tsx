'use client';

import { useState, useTransition } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { OwnerDashboard } from '@/components/dashboard/owner-dashboard';
import { getOwnerDashboardMetrics } from '@/app/actions/branch-admin';
import { PERIOD_LABELS, type DashboardPeriod } from '@/lib/date-buckets';
import type { PaymentFilter } from '@/lib/owner-analytics';

interface BranchOption {
  id: string;
  name: string;
}

const PAYMENT_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: 'ALL', label: 'Semua Metode' },
  { value: 'CASH', label: 'Tunai' },
  { value: 'BANK_TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
];

const PRODUCTION_LABELS: Record<string, string> = {
  WASHING: 'Cuci',
  DRYING: 'Jemur',
  IRONING: 'Setrika',
  FOLDING: 'Lipat',
};

export function OwnerDashboardClient({
  branches,
  initialData,
}: {
  branches: BranchOption[];
  initialData: Awaited<ReturnType<typeof getOwnerDashboardMetrics>>;
}) {
  const [data, setData] = useState(initialData);
  const [branchId, setBranchId] = useState('');
  const [period, setPeriod] = useState<DashboardPeriod>('today');
  const [paymentMethod, setPaymentMethod] = useState<PaymentFilter>('ALL');
  const [pending, startTransition] = useTransition();

  function applyFilters(b?: string, p?: DashboardPeriod, pay?: PaymentFilter) {
    startTransition(async () => {
      const result = await getOwnerDashboardMetrics({
        branchId: (b ?? branchId) || undefined,
        period: p ?? period,
        paymentMethod: pay ?? paymentMethod,
      });
      setData(result);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Filter className="h-4 w-4 text-rainbow-cyan" />
          Filter
          {pending && <Loader2 className="h-4 w-4 animate-spin text-rainbow-cyan" />}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">Cabang</label>
          <select
            value={branchId}
            onChange={(e) => {
              setBranchId(e.target.value);
              applyFilters(e.target.value);
            }}
            className="h-10 min-w-[180px] rounded-xl border border-brand-navy/15 px-3 text-sm"
          >
            <option value="">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">Periode</label>
          <select
            value={period}
            onChange={(e) => {
              const v = e.target.value as DashboardPeriod;
              setPeriod(v);
              applyFilters(undefined, v);
            }}
            className="h-10 min-w-[140px] rounded-xl border border-brand-navy/15 px-3 text-sm"
          >
            {(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map((k) => (
              <option key={k} value={k}>{PERIOD_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">Metode Bayar</label>
          <select
            value={paymentMethod}
            onChange={(e) => {
              const v = e.target.value as PaymentFilter;
              setPaymentMethod(v);
              applyFilters(undefined, undefined, v);
            }}
            className="h-10 min-w-[150px] rounded-xl border border-brand-navy/15 px-3 text-sm"
          >
            {PAYMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <OwnerDashboard
        {...data}
        productionLabels={PRODUCTION_LABELS}
        periodLabel={PERIOD_LABELS[period]}
      />
    </div>
  );
}
