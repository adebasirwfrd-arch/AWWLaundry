'use client';

import { useState, useTransition } from 'react';
import { Filter, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listCustomers, type CustomerListFilters, type CustomerPeriodFilter } from '@/app/actions/customers';
import { PERIOD_LABELS, type DashboardPeriod } from '@/lib/date-buckets';

type CustomerRow = Awaited<ReturnType<typeof listCustomers>>['customers'][0];

const CUSTOMER_PERIOD_LABELS: Record<CustomerPeriodFilter, string> = {
  all: 'Semua waktu',
  today: PERIOD_LABELS.today,
  week: PERIOD_LABELS.week,
  month: PERIOD_LABELS.month,
  year: PERIOD_LABELS.year,
};

function formatLastTransactionDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function CustomersPageClient({
  initialCustomers,
  branches,
  serviceTypes,
  showBranchFilter,
  branchLabel,
}: {
  initialCustomers: CustomerRow[];
  branches: Array<{ id: string; name: string }>;
  serviceTypes: Array<{ id: string; name: string }>;
  showBranchFilter: boolean;
  branchLabel: string;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [pending, startTransition] = useTransition();

  const [branchId, setBranchId] = useState('');
  const [period, setPeriod] = useState<CustomerPeriodFilter>('all');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [search, setSearch] = useState('');

  function applyFilters(overrides: Partial<CustomerListFilters> = {}) {
    const f: CustomerListFilters = {
      branchId: (overrides.branchId ?? branchId) || undefined,
      period: overrides.period ?? period,
      serviceTypeId: (overrides.serviceTypeId ?? serviceTypeId) || undefined,
      search: (overrides.search ?? search) || undefined,
    };
    startTransition(async () => {
      const res = await listCustomers(f);
      setCustomers(res.customers);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{customers.length} Pelanggan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-brand-navy/10 bg-brand-sky/5 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Filter className="h-4 w-4 text-rainbow-cyan" />
            Filter Pelanggan
            {pending && <Loader2 className="h-4 w-4 animate-spin text-rainbow-cyan" />}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {showBranchFilter ? (
              <FilterSelect
                label="Cabang"
                value={branchId}
                onChange={(v) => {
                  setBranchId(v);
                  applyFilters({ branchId: v || undefined });
                }}
                options={[
                  { value: '', label: 'Semua Cabang' },
                  ...branches.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            ) : (
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                  Cabang
                </label>
                <div className="flex h-10 items-center rounded-xl border border-brand-navy/15 bg-white px-3 text-sm text-brand-navy">
                  {branchLabel}
                </div>
              </div>
            )}

            <FilterSelect
              label="Periode Transaksi"
              value={period}
              onChange={(v) => {
                const p = v as CustomerPeriodFilter;
                setPeriod(p);
                applyFilters({ period: p });
              }}
              options={(Object.keys(CUSTOMER_PERIOD_LABELS) as CustomerPeriodFilter[]).map((k) => ({
                value: k,
                label: CUSTOMER_PERIOD_LABELS[k],
              }))}
            />

            <FilterSelect
              label="Layanan Terakhir"
              value={serviceTypeId}
              onChange={(v) => {
                setServiceTypeId(v);
                applyFilters({ serviceTypeId: v || undefined });
              }}
              options={[
                { value: '', label: 'Semua Layanan' },
                ...serviceTypes.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                Cari
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-navy/35" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search: search || undefined })}
                  onBlur={() => applyFilters({ search: search || undefined })}
                  placeholder="Nama atau telepon..."
                  className="h-10 w-full rounded-xl border border-brand-navy/15 bg-white pl-9 pr-3 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-aww-border text-left text-brand-navy/60">
                <th className="pb-3 pr-4">Nama</th>
                <th className="pb-3 pr-4">Telepon</th>
                <th className="pb-3 pr-4">Cabang</th>
                <th className="pb-3 pr-4">Terakhir Transaksi</th>
                <th className="pb-3 pr-4">Jumlah Transaksi</th>
                <th className="pb-3 pr-4">Transaksi Terakhir</th>
                <th className="pb-3">Poin Loyalitas</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-brand-navy/40">
                    Tidak ada pelanggan sesuai filter
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-aww-border/50">
                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                    <td className="py-3 pr-4">{c.phone}</td>
                    <td className="py-3 pr-4">{c.branchName ?? '—'}</td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {formatLastTransactionDate(c.lastOrderAt)}
                    </td>
                    <td className="py-3 pr-4">{c.orderCount} transaksi</td>
                    <td className="py-3 pr-4">{c.lastServiceName ?? '—'}</td>
                    <td className="py-3">{c.loyaltyPoints} poin</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
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
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border border-brand-navy/15 bg-white px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
