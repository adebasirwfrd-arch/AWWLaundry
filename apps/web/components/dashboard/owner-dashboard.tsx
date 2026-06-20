'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
} from 'recharts';
import { TrendingUp, Package, CheckCircle, Wallet, Scale, Star, Gift, WashingMachine, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/animations/animated-counter';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatCurrency, formatWeight, PAYMENT_METHOD_LABELS } from '@aww/shared';
import { palette } from '@aww/design-tokens';

interface DashboardProps {
  metrics: {
    ordersIn: number;
    ordersReady: number;
    ordersPickedUp: number;
    revenue: number;
    totalWeightIn: number;
    unpaidTotal: number;
  };
  pipeline: { status: string; _count: number }[];
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    weightKg: number;
    customer: { name: string };
    serviceType: { name: string };
  }>;
  ratingChart: Array<{ date: string; count: number; avgRating: number }>;
  ratingDistribution: Array<{ star: string; count: number }>;
  redeemChart: Array<{ date: string; users: number; points: number }>;
  reviewStats: { total: number; avgRating: number };
  redeemStats: { uniqueUsers: number; totalPoints: number };
  productionPipeline?: Array<{ status: string; count: number }>;
  paymentBreakdown?: Array<{ method: string; amount: number; count: number }>;
  avg7d?: { ordersPerDay: number; weightPerDay: number; revenuePerDay: number };
  periodLabel?: string;
  productionLabels?: Record<string, string>;
}

const RAINBOW_COLORS = Object.values(palette.rainbow);

export function OwnerDashboard({
  metrics,
  pipeline,
  recentOrders,
  ratingChart,
  ratingDistribution,
  redeemChart,
  reviewStats,
  redeemStats,
  productionPipeline = [],
  paymentBreakdown = [],
  avg7d,
  periodLabel = 'Hari Ini',
  productionLabels = {},
}: DashboardProps) {
  const pipelineData = pipeline.map((p) => ({
    name: p.status,
    count: p._count,
  }));

  const kpiCards = [
    { label: `Masuk (${periodLabel})`, value: metrics.ordersIn, icon: Package, color: 'text-rainbow-cyan' },
    { label: 'Selesai', value: metrics.ordersReady, icon: CheckCircle, color: 'text-rainbow-green' },
    { label: 'Diambil', value: metrics.ordersPickedUp, icon: TrendingUp, color: 'text-rainbow-blue' },
    { label: 'Berat Masuk', value: metrics.totalWeightIn, icon: Scale, color: 'text-rainbow-purple', suffix: ' kg' },
  ];

  const productionData = productionPipeline.map((p) => ({
    name: productionLabels[p.status] ?? p.status,
    count: p.count,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-brand-navy/60">{kpi.label}</p>
                    <p className="font-display text-3xl font-bold text-brand-navy">
                      <AnimatedCounter
                        value={kpi.value}
                        suffix={kpi.suffix}
                      />
                    </p>
                  </div>
                  <Icon className={`h-10 w-10 ${kpi.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-brand-orange" />
              Pendapatan ({periodLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-4xl font-bold text-brand-orange">
              <AnimatedCounter value={metrics.revenue} prefix="Rp " />
            </p>
            {metrics.unpaidTotal > 0 && (
              <p className="mt-2 text-sm text-amber-600">
                Piutang: {formatCurrency(metrics.unpaidTotal)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline Order</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pipelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {pipelineData.map((_, i) => (
                    <Cell key={i} fill={RAINBOW_COLORS[i % RAINBOW_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Proses cuci + rata-rata 7 hari */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WashingMachine className="h-5 w-5 text-rainbow-cyan" />
              Proses Cuci ({periodLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {productionData.map((_, i) => (
                      <Cell key={i} fill={RAINBOW_COLORS[i % RAINBOW_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-brand-navy/45">Tidak ada order dalam proses cuci</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rata-rata 7 Hari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-brand-navy/50">Order / hari</p>
              <p className="font-display text-2xl font-bold text-brand-navy">{avg7d?.ordersPerDay ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-brand-navy/50">Berat / hari</p>
              <p className="font-display text-2xl font-bold text-brand-navy">
                {avg7d?.weightPerDay ?? 0} <span className="text-base font-medium">kg</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-navy/50">Pendapatan / hari</p>
              <p className="font-display text-2xl font-bold text-brand-orange">
                {formatCurrency(avg7d?.revenuePerDay ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metode pembayaran */}
      {paymentBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-rainbow-purple" />
              Metode Pembayaran ({periodLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {paymentBreakdown.map((p) => (
                <div key={p.method} className="rounded-xl border border-brand-navy/10 bg-brand-sky/5 px-4 py-3">
                  <p className="text-sm font-semibold text-brand-navy">
                    {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                  </p>
                  <p className="font-display text-xl font-bold text-brand-orange">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-brand-navy/45">{p.count} transaksi</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rating & loyalty — 7 hari */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-navy/60">Rating Rata-rata (7 hari)</p>
                <p className="font-display text-3xl font-bold text-brand-navy">
                  {reviewStats.avgRating > 0 ? reviewStats.avgRating : '—'}
                  {reviewStats.avgRating > 0 && <span className="text-lg text-rainbow-yellow"> ★</span>}
                </p>
                <p className="text-xs text-brand-navy/45">{reviewStats.total} ulasan</p>
              </div>
              <Star className="h-10 w-10 text-rainbow-yellow opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-navy/60">Pelanggan Redeem (7 hari)</p>
                <p className="font-display text-3xl font-bold text-brand-navy">
                  <AnimatedCounter value={redeemStats.uniqueUsers} />
                </p>
                <p className="text-xs text-brand-navy/45">user pakai poin</p>
              </div>
              <Gift className="h-10 w-10 text-rainbow-pink opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-navy/60">Total Poin Diredeem (7 hari)</p>
                <p className="font-display text-3xl font-bold text-brand-orange">
                  <AnimatedCounter value={redeemStats.totalPoints} suffix=" poin" />
                </p>
                <p className="text-xs text-brand-navy/45">100 poin = gratis 1 kg cuci</p>
              </div>
              <Gift className="h-10 w-10 text-brand-orange opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-rainbow-yellow" />
              Ulasan Pelanggan (7 hari)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={ratingChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'avgRating' ? [`${value} ★`, 'Rata-rata'] : [value, 'Jumlah ulasan']
                  }
                />
                <Bar yAxisId="left" dataKey="count" fill={palette.rainbow.yellow} radius={[6, 6, 0, 0]} name="count" />
                <Line yAxisId="right" type="monotone" dataKey="avgRating" stroke={palette.rainbow.pink} strokeWidth={2} dot name="avgRating" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi Bintang (7 hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ratingDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="star" width={40} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {ratingDistribution.map((_, i) => (
                    <Cell key={i} fill={RAINBOW_COLORS[i % RAINBOW_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-brand-orange" />
            Redeem Poin (7 hari)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={redeemChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'points' ? [`${value} poin`, 'Poin diredeem'] : [value, 'Pelanggan']
                }
              />
              <Bar yAxisId="left" dataKey="points" fill={palette.brand.orange} radius={[6, 6, 0, 0]} name="points" />
              <Line yAxisId="right" type="monotone" dataKey="users" stroke={palette.rainbow.purple} strokeWidth={2} dot name="users" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-aww-border text-left text-brand-navy/60">
                  <th className="pb-3 pr-4">No. Order</th>
                  <th className="pb-3 pr-4">Pelanggan</th>
                  <th className="pb-3 pr-4">Layanan</th>
                  <th className="pb-3 pr-4">Berat</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-aww-border/50">
                    <td className="py-3 pr-4 font-mono font-medium">{order.orderNumber}</td>
                    <td className="py-3 pr-4">{order.customer.name}</td>
                    <td className="py-3 pr-4">{order.serviceType.name}</td>
                    <td className="py-3 pr-4">{formatWeight(order.weightKg)}</td>
                    <td className="py-3 pr-4 font-semibold">{formatCurrency(order.total)}</td>
                    <td className="py-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
