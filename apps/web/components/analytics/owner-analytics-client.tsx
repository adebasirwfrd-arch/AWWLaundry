'use client';

import { useState, useTransition } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  ReferenceLine,
} from 'recharts';
import {
  Filter,
  Loader2,
  Package,
  Wallet,
  Users,
  Star,
  WashingMachine,
  Boxes,
  TrendingUp,
  Clock,
  Percent,
  CircleDollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOwnerAnalytics } from '@/app/actions/analytics';
import { PERIOD_LABELS, type DashboardPeriod } from '@/lib/date-buckets';
import { formatCurrency, PAYMENT_METHOD_LABELS } from '@aww/shared';
import { palette } from '@aww/design-tokens';
import type { PaymentFilter } from '@/lib/owner-full-analytics';

type AnalyticsData = Awaited<ReturnType<typeof getOwnerAnalytics>>;

const RAINBOW = Object.values(palette.rainbow);

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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  WASHING: 'Cuci',
  DRYING: 'Jemur',
  IRONING: 'Setrika',
  FOLDING: 'Lipat',
  READY: 'Siap',
  PICKED_UP: 'Diambil',
  DELIVERED: 'Diantar',
  CANCELLED: 'Batal',
};

export function OwnerAnalyticsClient({
  initialData,
  showBranchFilter,
  branchLabel,
}: {
  initialData: AnalyticsData;
  showBranchFilter: boolean;
  branchLabel: string;
}) {
  const [data, setData] = useState(initialData);
  const [branchId, setBranchId] = useState('');
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const [paymentMethod, setPaymentMethod] = useState<PaymentFilter>('ALL');
  const [pending, startTransition] = useTransition();

  function applyFilters(b?: string, p?: DashboardPeriod, pay?: PaymentFilter) {
    startTransition(async () => {
      const result = await getOwnerAnalytics({
        branchId: (b ?? branchId) || undefined,
        period: p ?? period,
        paymentMethod: pay ?? paymentMethod,
      });
      setData(result);
    });
  }

  const periodLabel = PERIOD_LABELS[period];
  const pnl = data.cashflow.realizedPnl;
  const productionData = data.productionPipeline.map((p) => ({
    name: PRODUCTION_LABELS[p.status] ?? p.status,
    count: p.count,
  }));

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-2xl border border-brand-navy/10 bg-brand-sky/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Filter className="h-4 w-4 text-rainbow-cyan" />
          Filter Analitik
          {pending && <Loader2 className="h-4 w-4 animate-spin text-rainbow-cyan" />}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {showBranchFilter ? (
            <FilterSelect
              label="Cabang"
              value={branchId}
              onChange={(v) => {
                setBranchId(v);
                applyFilters(v);
              }}
              options={[
                { value: '', label: 'Semua Cabang' },
                ...data.branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          ) : (
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                Cabang
              </label>
              <div className="flex h-10 items-center rounded-xl border border-brand-navy/15 bg-white px-3 text-sm">
                {branchLabel}
              </div>
            </div>
          )}
          <FilterSelect
            label="Periode"
            value={period}
            onChange={(v) => {
              const p = v as DashboardPeriod;
              setPeriod(p);
              applyFilters(undefined, p);
            }}
            options={(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map((k) => ({
              value: k,
              label: PERIOD_LABELS[k],
            }))}
          />
          <FilterSelect
            label="Metode Bayar"
            value={paymentMethod}
            onChange={(v) => {
              const pay = v as PaymentFilter;
              setPaymentMethod(pay);
              applyFilters(undefined, undefined, pay);
            }}
            options={PAYMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard icon={Package} label={`Order (${periodLabel})`} value={String(data.summary.orders)} color="text-rainbow-cyan" />
        <KpiCard icon={Wallet} label="Pendapatan" value={formatCurrency(data.summary.revenue)} color="text-brand-orange" />
        <KpiCard icon={TrendingUp} label="Net Cashflow" value={formatCurrency(data.summary.netCashflow)} color="text-rainbow-green" />
        <KpiCard icon={Users} label="Pelanggan Aktif" value={String(data.summary.activeCustomers)} color="text-rainbow-blue" />
        <KpiCard icon={Users} label="Pelanggan Baru" value={String(data.summary.newCustomers)} color="text-rainbow-purple" />
        <KpiCard icon={Star} label="Rating Rata-rata" value={data.summary.avgRating > 0 ? `${data.summary.avgRating} ★` : '—'} color="text-rainbow-yellow" />
        <KpiCard icon={Boxes} label="Stok Menipis" value={String(data.summary.lowStockCount)} color="text-rainbow-pink" />
      </div>

      {/* ORDER */}
      <SectionTitle icon={Package} title="Order" subtitle={`Tren & komposisi order — ${periodLabel}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Tren Order & Pendapatan (Area)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.orders.daily}>
              <defs>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.rainbow.cyan} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={palette.rainbow.cyan} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.brand.orange} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={palette.brand.orange} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number, name: string) => (name === 'revenue' ? formatCurrency(v) : [v, name === 'orders' ? 'Order' : 'Berat (kg)'])} />
              <Area yAxisId="left" type="monotone" dataKey="orders" stroke={palette.rainbow.cyan} fill="url(#orderGrad)" name="orders" />
              <Area yAxisId="right" type="monotone" dataKey="revenue" stroke={palette.brand.orange} fill="url(#revGrad)" name="revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Berat Cucian per Hari (Batang)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.orders.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} kg`, 'Berat']} />
              <Bar dataKey="weight" fill={palette.rainbow.purple} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Order (Donut)">
          <DonutChart
            data={data.orders.statusDonut.map((s) => ({
              name: STATUS_LABELS[s.name] ?? s.name,
              value: s.count,
            }))}
            height={260}
          />
        </ChartCard>

        <ChartCard title="Layanan Terpopuler (Donut)">
          <DonutChart
            data={data.orders.serviceDonut.map((s) => ({ name: s.name, value: s.count }))}
            height={260}
          />
        </ChartCard>

        <ChartCard title="Pipeline Order Aktif (Batang)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.pipeline.map((p) => ({ name: STATUS_LABELS[p.status] ?? p.status, count: p._count }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.pipeline.map((_, i) => (
                  <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* REALIZED PNL — God Tier Chart */}
      <SectionTitle
        icon={CircleDollarSign}
        title="Realized PnL"
        subtitle={`Uang real vs piutang (Bayar Nanti & DP) — ${periodLabel}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Realized (Tercatat)"
          value={formatCurrency(pnl.realizedIncome)}
          color="text-rainbow-green"
        />
        <KpiCard
          icon={Clock}
          label="Unrealized (Piutang)"
          value={formatCurrency(pnl.unrealizedIncome)}
          color="text-brand-orange"
        />
        <KpiCard
          icon={TrendingUp}
          label="Realized PnL"
          value={formatCurrency(pnl.realizedPnl)}
          color={pnl.realizedPnl >= 0 ? 'text-rainbow-cyan' : 'text-red-500'}
        />
        <KpiCard
          icon={Percent}
          label="Tingkat Realisasi"
          value={`${pnl.realizationRate}%`}
          color="text-rainbow-purple"
        />
      </div>

      <ChartCard title="Realized PnL Command Center — Tren Harian & Arus Kas" className="overflow-hidden border-2 border-rainbow-cyan/20 bg-gradient-to-br from-brand-sky/5 via-white to-rainbow-green/5">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={pnl.daily} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlRealizedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.rainbow.green} stopOpacity={0.55} />
                <stop offset="100%" stopColor={palette.rainbow.green} stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="pnlUnrealizedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.brand.orange} stopOpacity={0.5} />
                <stop offset="100%" stopColor={palette.brand.orange} stopOpacity={0.06} />
              </linearGradient>
              <linearGradient id="pnlExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid rgba(27,43,75,0.1)',
                boxShadow: '0 8px 24px rgba(27,43,75,0.12)',
              }}
              formatter={(v: number, name: string) => [formatCurrency(v), name]}
            />
            <ReferenceLine yAxisId="left" y={0} stroke="#94A3B8" strokeDasharray="5 5" />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="realizedIncome"
              fill="url(#pnlRealizedGrad)"
              stroke={palette.rainbow.green}
              strokeWidth={2}
              name="Realized (Masuk)"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="unrealizedIncome"
              fill="url(#pnlUnrealizedGrad)"
              stroke={palette.brand.orange}
              strokeWidth={2}
              name="Unrealized (Piutang)"
            />
            <Bar
              yAxisId="right"
              dataKey="realizedExpense"
              fill="url(#pnlExpenseGrad)"
              stroke="#EF4444"
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              name="Pengeluaran"
              barSize={14}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="realizedPnl"
              stroke={palette.rainbow.cyan}
              strokeWidth={3}
              dot={{ r: 3, fill: palette.rainbow.cyan, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              name="Realized PnL"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="bookedOrderValue"
              stroke={palette.rainbow.purple}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Nilai Order"
            />
            <Legend wrapperStyle={{ paddingTop: 12 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Komposisi Realized vs Piutang">
          <DonutChart
            data={[
              { name: 'Realized', value: pnl.realizedIncome },
              { name: 'Unrealized', value: pnl.unrealizedIncome },
            ].filter((row) => row.value > 0)}
            height={240}
            colors={[palette.rainbow.green, palette.brand.orange]}
            valueFormatter={(v) => formatCurrency(v)}
          />
        </ChartCard>

        <ChartCard title="Piutang per Sumber">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={[
                { name: 'Bayar Nanti', value: pnl.payLaterOutstanding },
                { name: 'Sisa DP', value: pnl.dpOutstanding },
                { name: 'Lainnya', value: pnl.otherOutstanding },
              ].filter((row) => row.value > 0)}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {[palette.rainbow.purple, palette.rainbow.pink, palette.rainbow.yellow].map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Realized vs Piutang per Perilaku">
          {pnl.breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pnl.breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="realized" stackId="a" fill={palette.rainbow.green} name="Realized" />
                <Bar dataKey="unrealized" stackId="a" fill={palette.brand.orange} radius={[0, 6, 6, 0]} name="Piutang" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      {/* CASHFLOW */}
      <SectionTitle icon={Wallet} title="Cashflow" subtitle={`Pemasukan, pengeluaran & arus kas — ${periodLabel}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Pemasukan vs Pengeluaran (Area + Garis Net)">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={data.cashflow.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="income" fill={palette.rainbow.green} fillOpacity={0.25} stroke={palette.rainbow.green} name="Pemasukan" />
              <Area type="monotone" dataKey="expense" fill={palette.brand.orange} fillOpacity={0.2} stroke={palette.brand.orange} name="Pengeluaran" />
              <Line type="monotone" dataKey="net" stroke={palette.rainbow.cyan} strokeWidth={2} dot={false} name="Net" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Metode Pembayaran (Donut)">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data.cashflow.paymentMethods}
                dataKey="amount"
                nameKey="method"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                label={({ method, percent }) =>
                  `${PAYMENT_METHOD_LABELS[method as string] ?? method} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.cashflow.paymentMethods.map((_, i) => (
                  <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {data.cashflow.incomeByBranch.length > 1 && (
          <ChartCard title="Pemasukan per Cabang (Batang Horizontal)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.cashflow.incomeByBranch} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="branchName" width={110} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill={palette.rainbow.cyan} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <ChartCard title="CAPEX vs OPEX (Donut)">
          <DonutChart
            data={data.cashflow.capexOpexSplit.map((c) => ({ name: c.name, value: c.value }))}
            height={240}
            colors={[palette.rainbow.purple, palette.brand.orange]}
          />
        </ChartCard>

        {data.cashflow.heatmap.length > 0 && data.cashflow.heatmap[0].cells.length > 0 && (
          <ChartCard title="Heatmap Pemasukan — Cabang × Hari" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-brand-navy/50">Hari</th>
                    {data.cashflow.heatmap[0].cells.map((c) => (
                      <th key={c.branchId} className="p-2 text-center text-brand-navy/50">
                        {c.branchName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.cashflow.heatmap.map((row) => (
                    <tr key={row.date}>
                      <td className="p-2 font-medium text-brand-navy/70">{row.date}</td>
                      {row.cells.map((cell) => {
                        const intensity = cell.amount / data.cashflow.maxHeat;
                        return (
                          <td key={cell.branchId} className="p-1">
                            <div
                              className="rounded-lg px-2 py-3 text-center font-semibold"
                              style={{
                                backgroundColor: `rgba(0, 194, 224, ${0.1 + intensity * 0.85})`,
                                color: intensity > 0.5 ? '#fff' : '#1B2B4B',
                              }}
                              title={formatCurrency(cell.amount)}
                            >
                              {cell.amount > 0 ? `${Math.round(cell.amount / 1000)}k` : '—'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}
      </div>

      {/* PAYMENT BEHAVIOR */}
      <SectionTitle
        icon={Clock}
        title="Perilaku Pembayaran"
        subtitle={`Analisis Bayar Nanti, DP, dan piutang pelanggan — ${periodLabel}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          label="Piutang Aktif"
          value={formatCurrency(data.summary.outstandingTotal ?? 0)}
          color="text-brand-orange"
        />
        <KpiCard
          icon={Clock}
          label="Piutang Bayar Nanti"
          value={formatCurrency(data.summary.payLaterOutstanding ?? 0)}
          color="text-rainbow-purple"
        />
        <KpiCard
          icon={Percent}
          label="Piutang Sisa DP"
          value={formatCurrency(data.summary.dpOutstanding ?? 0)}
          color="text-rainbow-pink"
        />
        <KpiCard
          icon={TrendingUp}
          label="Pelunasan DP"
          value={`${data.paymentBehavior.collection.dp.rate}%`}
          color="text-rainbow-green"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Preferensi Metode Pembayaran (Donut)">
          {data.paymentBehavior.byMode.length > 0 ? (
            <DonutChart
              data={data.paymentBehavior.byMode.map((row) => ({
                name: row.label,
                value: row.count,
              }))}
              height={260}
            />
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Piutang per Perilaku (Batang Horizontal)">
          {data.paymentBehavior.byMode.some((row) => row.outstanding > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={data.paymentBehavior.byMode.filter((row) => row.outstanding > 0)}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="outstanding" fill={palette.brand.orange} radius={[0, 6, 6, 0]} name="Piutang" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Tren Bayar Nanti vs Kombinasi DP (Area)">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.paymentBehavior.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="payLater" stackId="1" fill={palette.rainbow.purple} fillOpacity={0.35} stroke={palette.rainbow.purple} name="Bayar Nanti" />
              <Area type="monotone" dataKey="combinationDp" stackId="1" fill={palette.rainbow.pink} fillOpacity={0.35} stroke={palette.rainbow.pink} name="Kombinasi DP" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tercatat vs Piutang per Perilaku (Batang)">
          {data.paymentBehavior.byMode.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.paymentBehavior.byMode}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={70} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => formatCurrency(v)} />
                <Bar dataKey="collected" fill={palette.rainbow.green} radius={[6, 6, 0, 0]} name="Tercatat" />
                <Bar dataKey="outstanding" fill={palette.brand.orange} radius={[6, 6, 0, 0]} name="Piutang" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Ringkasan Konversi Pembayaran" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-rainbow-pink/20 bg-rainbow-pink/5 p-4">
              <p className="text-sm font-semibold text-brand-navy">Kombinasi (DP)</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{data.paymentBehavior.collection.dp.orders} order</p>
              <p className="mt-1 text-sm text-brand-navy/60">
                {data.paymentBehavior.collection.dp.fullyPaid} lunas · {data.paymentBehavior.collection.dp.rate}% pelunasan penuh
              </p>
              <p className="mt-2 text-sm text-brand-orange">
                Piutang sisa: {formatCurrency(data.paymentBehavior.outstanding.combinationDp)}
              </p>
            </div>
            <div className="rounded-2xl border border-rainbow-purple/20 bg-rainbow-purple/5 p-4">
              <p className="text-sm font-semibold text-brand-navy">Bayar Nanti</p>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{data.paymentBehavior.collection.payLater.orders} order</p>
              <p className="mt-1 text-sm text-brand-navy/60">
                {data.paymentBehavior.collection.payLater.collected} sudah bayar · {data.paymentBehavior.collection.payLater.rate}% konversi
              </p>
              <p className="mt-2 text-sm text-brand-orange">
                Piutang aktif: {formatCurrency(data.paymentBehavior.outstanding.payLater)}
              </p>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* PRODUCTION */}
      <SectionTitle icon={WashingMachine} title="Produksi" subtitle={`Board produksi & alur cucian — ${periodLabel}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Order dalam Proses (Batang)">
          {productionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {productionData.map((_, i) => (
                    <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Tren Produksi Harian (Area Bertumpuk)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.production.daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="washing" stackId="1" fill={palette.rainbow.cyan} stroke={palette.rainbow.cyan} name="Cuci" />
              <Area type="monotone" dataKey="drying" stackId="1" fill={palette.rainbow.blue} stroke={palette.rainbow.blue} name="Jemur" />
              <Area type="monotone" dataKey="ironing" stackId="1" fill={palette.rainbow.purple} stroke={palette.rainbow.purple} name="Setrika" />
              <Area type="monotone" dataKey="folding" stackId="1" fill={palette.rainbow.pink} stroke={palette.rainbow.pink} name="Lipat" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* RATING */}
      <SectionTitle icon={Star} title="Rating & Loyalitas" subtitle="Ulasan pelanggan dan redeem poin" />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Ulasan Harian (Batang + Garis Rating)">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data.ratingChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'avgRating' ? [`${v} ★`, 'Rata-rata'] : [v, 'Jumlah ulasan']
                }
              />
              <Bar yAxisId="left" dataKey="count" fill={palette.rainbow.yellow} radius={[6, 6, 0, 0]} name="count" />
              <Line yAxisId="right" type="monotone" dataKey="avgRating" stroke={palette.rainbow.pink} strokeWidth={2} dot name="avgRating" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribusi Bintang (Batang Horizontal)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.ratingDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="star" width={40} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.ratingDistribution.map((_, i) => (
                  <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Redeem Poin (Area + Garis Pelanggan)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data.redeemChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
              <Tooltip
                formatter={(v: number, name: string) =>
                  name === 'points' ? [`${v} poin`, 'Poin'] : [v, 'Pelanggan']
                }
              />
              <Area yAxisId="left" type="monotone" dataKey="points" fill={palette.brand.orange} fillOpacity={0.3} stroke={palette.brand.orange} name="points" />
              <Line yAxisId="right" type="monotone" dataKey="users" stroke={palette.rainbow.purple} strokeWidth={2} dot name="users" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* STOCK */}
      <SectionTitle icon={Boxes} title="Stok" subtitle={`Inventori & pergerakan stok — ${periodLabel}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-brand-navy/60">Total Item Inventori</p>
            <p className="font-display text-3xl font-bold text-brand-navy">{data.stock.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-brand-navy/60">Nilai Stok</p>
            <p className="font-display text-3xl font-bold text-brand-orange">{formatCurrency(data.stock.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-brand-navy/60">Item Menipis</p>
            <p className="font-display text-3xl font-bold text-rainbow-pink">{data.summary.lowStockCount}</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Nilai Stok per Kategori (Donut)">
          <DonutChart
            data={data.stock.byCategory.map((c) => ({ name: c.category, value: c.value }))}
            height={240}
            valueFormatter={formatCurrency}
          />
        </ChartCard>

        {data.stock.byBranch.length > 1 && (
          <ChartCard title="Nilai Stok per Cabang (Batang Horizontal)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.stock.byBranch} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="branchName" width={110} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="value" fill={palette.rainbow.purple} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <ChartCard title="Pergerakan Stok per Tipe (Batang)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.stock.movementByType}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={palette.rainbow.cyan} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Stok Masuk vs Keluar (Area)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.stock.movementDaily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="in" fill={palette.rainbow.green} fillOpacity={0.35} stroke={palette.rainbow.green} name="Masuk" />
              <Area type="monotone" dataKey="out" fill={palette.brand.orange} fillOpacity={0.3} stroke={palette.brand.orange} name="Keluar" />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {data.stock.lowStock.length > 0 && (
          <ChartCard title="Item Stok Menipis (Batang)" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={Math.max(180, data.stock.lowStock.length * 28)}>
              <BarChart data={data.stock.lowStock} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number, _n, p) => [`${v} ${(p as { payload?: { unit?: string } }).payload?.unit ?? ''}`, 'Stok']} />
                <Bar dataKey="current" fill={palette.rainbow.pink} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* CUSTOMERS */}
      <SectionTitle icon={Users} title="Pelanggan" subtitle={`Pertumbuhan & kontribusi pelanggan — ${periodLabel}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Pelanggan Baru per Hari (Area)">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.customers.dailyNew}>
              <defs>
                <linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.rainbow.blue} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={palette.rainbow.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke={palette.rainbow.blue} fill="url(#custGrad)" name="Pelanggan baru" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Pelanggan by Order (Batang Horizontal)">
          {data.customers.top.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.customers.top} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number, name: string) => (name === 'revenue' ? formatCurrency(v) : [v, 'Order'])} />
                <Bar dataKey="orders" fill={palette.rainbow.cyan} radius={[0, 6, 6, 0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard title="Top 10 Poin Loyalitas (Batang)" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.customers.loyaltyTop}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} poin`, 'Loyalitas']} />
              <Bar dataKey="loyaltyPoints" fill={palette.brand.orange} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-sky/30">
        <Icon className="h-5 w-5 text-brand-navy" />
      </div>
      <div>
        <h2 className="font-display text-xl font-bold text-brand-navy">{title}</h2>
        <p className="text-sm text-brand-navy/55">{subtitle}</p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DonutChart({
  data,
  height = 240,
  colors,
  valueFormatter,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  colors?: string[];
  valueFormatter?: (v: number) => string;
}) {
  if (data.length === 0) return <EmptyChart />;
  const paletteColors = colors ?? RAINBOW;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={paletteColors[i % paletteColors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => (valueFormatter ? valueFormatter(v) : v)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-brand-navy/55">{label}</p>
          <p className="font-display text-lg font-bold text-brand-navy">{value}</p>
        </div>
        <Icon className={`h-7 w-7 shrink-0 ${color} opacity-75`} />
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

function EmptyChart() {
  return <p className="py-12 text-center text-sm text-brand-navy/40">Belum ada data</p>;
}
