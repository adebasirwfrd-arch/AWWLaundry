export interface CuciankuOrder {
  id: string;
  orderNumber: string;
  serviceName: string;
  weightKg: number;
  total: number;
  status: string;
  monthKey: string;
  createdAt: string;
  loyaltyPointsEarned: number;
  loyaltyPointsRedeemed: number;
  rating: number | null;
  paid: boolean;
}

export interface CuciankuFilters {
  month: string;
  weightRange: 'all' | 'light' | 'medium' | 'heavy';
  rating: 'all' | '5' | '4plus' | '3plus' | 'with' | 'none';
  points: 'all' | 'earned' | 'redeemed' | 'both';
  service: string;
}

export const DEFAULT_CUCIANKU_FILTERS: CuciankuFilters = {
  month: 'all',
  weightRange: 'all',
  rating: 'all',
  points: 'all',
  service: 'all',
};

export function filterCuciankuOrders(orders: CuciankuOrder[], f: CuciankuFilters): CuciankuOrder[] {
  return orders.filter((o) => {
    if (f.month !== 'all' && o.monthKey !== f.month) return false;
    if (f.service !== 'all' && o.serviceName !== f.service) return false;

    if (f.weightRange === 'light' && (o.weightKg <= 0 || o.weightKg > 3)) return false;
    if (f.weightRange === 'medium' && (o.weightKg < 3 || o.weightKg > 7)) return false;
    if (f.weightRange === 'heavy' && o.weightKg < 7) return false;

    if (f.rating === '5' && o.rating !== 5) return false;
    if (f.rating === '4plus' && (o.rating == null || o.rating < 4)) return false;
    if (f.rating === '3plus' && (o.rating == null || o.rating < 3)) return false;
    if (f.rating === 'with' && o.rating == null) return false;
    if (f.rating === 'none' && o.rating != null) return false;

    if (f.points === 'earned' && o.loyaltyPointsEarned <= 0) return false;
    if (f.points === 'redeemed' && o.loyaltyPointsRedeemed <= 0) return false;
    if (f.points === 'both' && o.loyaltyPointsEarned <= 0 && o.loyaltyPointsRedeemed <= 0) return false;

    return true;
  });
}

export function aggregateCucianku(orders: CuciankuOrder[]) {
  const totalOrders = orders.length;
  const totalKg = orders.reduce((s, o) => s + o.weightKg, 0);
  const totalSpend = orders.reduce((s, o) => s + o.total, 0);
  const pointsEarned = orders.reduce((s, o) => s + o.loyaltyPointsEarned, 0);
  const pointsRedeemed = orders.reduce((s, o) => s + o.loyaltyPointsRedeemed, 0);
  const rated = orders.filter((o) => o.rating != null);
  const avgRating =
    rated.length > 0 ? Math.round((rated.reduce((s, o) => s + (o.rating ?? 0), 0) / rated.length) * 10) / 10 : 0;

  const serviceMap = new Map<string, { count: number; total: number; kg: number }>();
  for (const o of orders) {
    const cur = serviceMap.get(o.serviceName) ?? { count: 0, total: 0, kg: 0 };
    cur.count += 1;
    cur.total += o.total;
    cur.kg += o.weightKg;
    serviceMap.set(o.serviceName, cur);
  }
  const byService = [...serviceMap.entries()].map(([name, v]) => ({
    name,
    count: v.count,
    total: v.total,
    kg: Math.round(v.kg * 10) / 10,
  }));

  const monthMap = new Map<string, { orders: number; spend: number; kg: number; earned: number; redeemed: number }>();
  for (const o of orders) {
    const cur = monthMap.get(o.monthKey) ?? { orders: 0, spend: 0, kg: 0, earned: 0, redeemed: 0 };
    cur.orders += 1;
    cur.spend += o.total;
    cur.kg += o.weightKg;
    cur.earned += o.loyaltyPointsEarned;
    cur.redeemed += o.loyaltyPointsRedeemed;
    monthMap.set(o.monthKey, cur);
  }
  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      month: formatMonthLabel(key),
      monthKey: key,
      orders: v.orders,
      spend: v.spend,
      kg: Math.round(v.kg * 10) / 10,
      earned: v.earned,
      redeemed: v.redeemed,
    }));

  const ratingDist = [1, 2, 3, 4, 5].map((star) => ({
    star: `${star}★`,
    count: orders.filter((o) => o.rating === star).length,
  }));

  const weightTrend = [...orders]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-12)
    .map((o, i) => ({
      label: `#${i + 1}`,
      kg: o.weightKg,
      spend: o.total,
      service: o.serviceName.slice(0, 12),
    }));

  const maxKg = Math.max(totalKg, 1);
  const maxSpend = Math.max(totalSpend, 1);
  const radar = [
    { subject: 'Pesanan', value: Math.min(100, totalOrders * 10), fullMark: 100 },
    { subject: 'Berat', value: Math.min(100, (totalKg / maxKg) * 100), fullMark: 100 },
    { subject: 'Belanja', value: Math.min(100, (totalSpend / maxSpend) * 100), fullMark: 100 },
    { subject: 'Rating', value: avgRating > 0 ? (avgRating / 5) * 100 : 0, fullMark: 100 },
    { subject: 'Poin', value: Math.min(100, (pointsEarned + pointsRedeemed) / 5), fullMark: 100 },
  ];

  const scatter = orders
    .filter((o) => o.weightKg > 0)
    .map((o) => ({
      kg: o.weightKg,
      spend: o.total,
      name: o.serviceName,
    }));

  return {
    kpis: { totalOrders, totalKg, totalSpend, avgRating, pointsEarned, pointsRedeemed },
    byService,
    byMonth,
    ratingDist,
    weightTrend,
    radar,
    scatter,
  };
}

export function uniqueMonths(orders: CuciankuOrder[]): string[] {
  return [...new Set(orders.map((o) => o.monthKey))].sort().reverse();
}

export function uniqueServices(orders: CuciankuOrder[]): string[] {
  return [...new Set(orders.map((o) => o.serviceName))].sort();
}

function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

export function monthKeyFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
