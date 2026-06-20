'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import {
  Scale,
  Star,
  Sparkles,
  Shirt,
  Wallet,
  Filter,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency } from '@aww/shared';
import { palette } from '@aww/design-tokens';
import { AnimatedCounter } from '@/components/animations/animated-counter';
import { WashLottieHero } from '@/components/customer/wash-lottie-hero';
import {
  type CuciankuOrder,
  type CuciankuFilters,
  DEFAULT_CUCIANKU_FILTERS,
  filterCuciankuOrders,
  aggregateCucianku,
  uniqueMonths,
  uniqueServices,
} from '@/lib/customer-analytics';
import { cn } from '@/lib/utils';

const CHART_COLORS = Object.values(palette.rainbow);

interface Props {
  orders: CuciankuOrder[];
  loyaltyPoints: number;
  customerName: string;
}

export function CuciankuDashboard({ orders, loyaltyPoints, customerName }: Props) {
  const [filters, setFilters] = useState<CuciankuFilters>(DEFAULT_CUCIANKU_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<HTMLDivElement>(null);

  const months = useMemo(() => uniqueMonths(orders), [orders]);
  const services = useMemo(() => uniqueServices(orders), [orders]);

  const filtered = useMemo(() => filterCuciankuOrders(orders, filters), [orders, filters]);
  const data = useMemo(() => aggregateCucianku(filtered), [filtered]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.month !== 'all') n++;
    if (filters.weightRange !== 'all') n++;
    if (filters.rating !== 'all') n++;
    if (filters.points !== 'all') n++;
    if (filters.service !== 'all') n++;
    return n;
  }, [filters]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('.cucianku-hero', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' });
      gsap.from('.cucianku-kpi', {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: 'back.out(1.4)',
        delay: 0.15,
      });
    }, el);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const el = chartsRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cucianku-chart',
        { y: 16, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out' }
      );
    }, el);
    return () => ctx.revert();
  }, [filtered]);

  function resetFilters() {
    setFilters(DEFAULT_CUCIANKU_FILTERS);
  }

  const radialRating = data.ratingDist.map((r, i) => ({
    ...r,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div ref={rootRef} className="space-y-5 pb-4">
      {/* Hero */}
      <div className="cucianku-hero overflow-hidden rounded-3xl bg-aww-header p-5 text-white shadow-aww-lg">
        <div className="flex items-center gap-4">
          <WashLottieHero className="h-20 w-20 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Dashboard</p>
            <h1 className="font-display text-2xl font-extrabold">Cucianku</h1>
            <p className="mt-1 text-sm text-white/80">
              Halo {customerName.split(' ')[0]}, pantau statistik cucianmu di sini
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-rainbow-yellow" />
            {loyaltyPoints} poin aktif
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {filtered.length} / {orders.length} transaksi
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-2 font-display text-sm font-bold text-brand-navy">
            <Filter className="h-4 w-4 text-rainbow-cyan" />
            Filter Cucian
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-rainbow-pink/15 px-2 py-0.5 text-[10px] font-semibold text-brand-pink">
                {activeFilterCount} aktif
              </span>
            )}
          </span>
          <span className="text-xs text-brand-navy/45">{filtersOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
        </button>

        {filtersOpen && (
          <div className="mt-4 space-y-3 border-t border-brand-navy/10 pt-4">
            <FilterRow label="Bulan">
              <select
                value={filters.month}
                onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                className="h-full w-full rounded-xl border border-brand-navy/12 bg-white px-3 py-2 text-[13px] text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/25"
              >
                <option value="all">Semua bulan</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {new Date(Number(m.split('-')[0]), Number(m.split('-')[1]) - 1).toLocaleDateString('id-ID', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </option>
                ))}
              </select>
            </FilterRow>

            <FilterRow label="Berat (kg)">
              <select
                value={filters.weightRange}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, weightRange: e.target.value as CuciankuFilters['weightRange'] }))
                }
                className="h-full w-full rounded-xl border border-brand-navy/12 bg-white px-3 py-2 text-[13px] text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/25"
              >
                <option value="all">Semua berat</option>
                <option value="light">Ringan (≤ 3 kg)</option>
                <option value="medium">Sedang (3–7 kg)</option>
                <option value="heavy">Berat (≥ 7 kg)</option>
              </select>
            </FilterRow>

            <FilterRow label="Rating">
              <select
                value={filters.rating}
                onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value as CuciankuFilters['rating'] }))}
                className="h-full w-full rounded-xl border border-brand-navy/12 bg-white px-3 py-2 text-[13px] text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/25"
              >
                <option value="all">Semua rating</option>
                <option value="5">5 bintang</option>
                <option value="4plus">4 bintang ke atas</option>
                <option value="3plus">3 bintang ke atas</option>
                <option value="with">Sudah diulas</option>
                <option value="none">Belum diulas</option>
              </select>
            </FilterRow>

            <FilterRow label="Poin">
              <select
                value={filters.points}
                onChange={(e) => setFilters((f) => ({ ...f, points: e.target.value as CuciankuFilters['points'] }))}
                className="h-full w-full rounded-xl border border-brand-navy/12 bg-white px-3 py-2 text-[13px] text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/25"
              >
                <option value="all">Semua</option>
                <option value="earned">Dapat poin</option>
                <option value="redeemed">Redeem poin</option>
                <option value="both">Dapat / redeem poin</option>
              </select>
            </FilterRow>

            <FilterRow label="Jenis cucian">
              <select
                value={filters.service}
                onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}
                className="h-full w-full rounded-xl border border-brand-navy/12 bg-white px-3 py-2 text-[13px] text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/25"
              >
                <option value="all">Semua layanan</option>
                {services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FilterRow>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-navy/10 py-2 text-xs font-semibold text-brand-navy/60 hover:bg-brand-navy/5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset filter
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={Shirt} label="Total Cucian" value={data.kpis.totalOrders} suffix="x" color="text-rainbow-cyan" />
        <KpiCard icon={Scale} label="Total Berat" value={Math.round(data.kpis.totalKg * 10) / 10} suffix=" kg" color="text-rainbow-purple" />
        <KpiCard icon={Wallet} label="Total Belanja" value={data.kpis.totalSpend} prefix="Rp " color="text-brand-orange" />
        <KpiCard icon={Star} label="Rating Rata-rata" value={data.kpis.avgRating || 0} suffix={data.kpis.avgRating ? ' ★' : ''} color="text-rainbow-yellow" />
        <KpiCard icon={Sparkles} label="Poin Didapat" value={data.kpis.pointsEarned} suffix=" pt" color="text-rainbow-green" />
        <KpiCard icon={TrendingUp} label="Poin Redeem" value={data.kpis.pointsRedeemed} suffix=" pt" color="text-rainbow-pink" />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-navy/15 py-16 text-center text-brand-navy/45">
          <p className="font-semibold text-brand-navy/60">Tidak ada data untuk filter ini</p>
          <p className="mt-1 text-sm">Coba ubah filter atau pesan cucian baru</p>
        </div>
      ) : (
        <div ref={chartsRef} className="space-y-4">
          {/* Donut — jenis cucian */}
          <ChartCard title="Komposisi Jenis Cucian" subtitle="Donut chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.byService}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  animationDuration={800}
                >
                  {data.byService.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Area — belanja per bulan */}
          {data.byMonth.length > 0 && (
            <ChartCard title="Tren Belanja" subtitle="Area chart per bulan">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.byMonth}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.brand.orange} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={palette.brand.orange} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="spend" stroke={palette.brand.orange} fill="url(#spendGrad)" strokeWidth={2} animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Radar — profil cucian */}
          <ChartCard title="Profil Cucianmu" subtitle="Radar chart">
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={data.radar}>
                <PolarGrid stroke="#E8ECF2" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: palette.brand.navy }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Skor"
                  dataKey="value"
                  stroke={palette.rainbow.cyan}
                  fill={palette.rainbow.cyan}
                  fillOpacity={0.35}
                  animationDuration={1000}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Line + Bar composed — berat & pesanan per bulan */}
          {data.byMonth.length > 0 && (
            <ChartCard title="Berat & Pesanan per Bulan" subtitle="Line + bar">
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="kg" name="Berat (kg)" fill={palette.rainbow.purple} radius={[6, 6, 0, 0]} animationDuration={800} />
                  <Line yAxisId="right" type="monotone" dataKey="orders" name="Pesanan" stroke={palette.rainbow.pink} strokeWidth={2} dot animationDuration={900} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Radial — distribusi rating */}
          <ChartCard title="Distribusi Rating" subtitle="Radial bar">
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialRating} startAngle={180} endAngle={0}>
                <RadialBar background dataKey="count" cornerRadius={8} animationDuration={900} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Scatter — berat vs belanja */}
          {data.scatter.length > 0 && (
            <ChartCard title="Berat vs Belanja" subtitle="Scatter chart">
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" />
                  <XAxis type="number" dataKey="kg" name="Berat" unit=" kg" tick={{ fontSize: 10 }} />
                  <YAxis type="number" dataKey="spend" name="Belanja" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <ZAxis range={[80, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, n: string) => (n === 'Belanja' ? formatCurrency(v) : v)} />
                  <Scatter name="Transaksi" data={data.scatter} fill={palette.rainbow.blue} animationDuration={800} />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Line — tren berat per pesanan */}
          {data.weightTrend.length > 0 && (
            <ChartCard title="Tren Berat per Pesanan" subtitle="Line chart">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.weightTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kg" />
                  <Tooltip />
                  <Line type="monotone" dataKey="kg" stroke={palette.rainbow.green} strokeWidth={2.5} dot={{ r: 4 }} animationDuration={900} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Stacked bar — poin per bulan */}
          {data.byMonth.some((m) => m.earned > 0 || m.redeemed > 0) && (
            <ChartCard title="Poin Loyalty per Bulan" subtitle="Grouped bar">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8ECF2" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="earned" name="Didapat" fill={palette.rainbow.green} radius={[4, 4, 0, 0]} stackId="a" animationDuration={800} />
                  <Bar dataKey="redeemed" name="Redeem" fill={palette.rainbow.pink} radius={[4, 4, 0, 0]} stackId="b" animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color: string;
}) {
  return (
    <div className="cucianku-kpi rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
      <div className={cn('mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sky/10', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-brand-navy/45">{label}</p>
      <p className="font-display text-lg font-bold text-brand-navy">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} duration={0.9} />
      </p>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-brand-navy/55">{label}</label>
      {children}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="cucianku-chart overflow-hidden rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
      <div className="mb-3">
        <p className="font-display text-sm font-bold text-brand-navy">{title}</p>
        <p className="text-[10px] text-brand-navy/40">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
