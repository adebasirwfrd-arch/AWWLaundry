import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { prisma } from '@aww/database';
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts';

export default async function AnalyticsPage() {
  const session = await requireAuth([Role.OWNER, Role.MANAGER]);

  const branchId = session.user.branchId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dailyData = await Promise.all(
    last7Days.map(async (date) => {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const [orders, revenue] = await Promise.all([
        prisma.order.count({
          where: { branchId, createdAt: { gte: date, lt: next } },
        }),
        prisma.payment.aggregate({
          where: { branchId, paidAt: { gte: date, lt: next } },
          _sum: { amount: true },
        }),
      ]);
      return {
        date: date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        orders,
        revenue: revenue._sum.amount ?? 0,
      };
    })
  );

  const paymentBreakdownRaw = await prisma.payment.groupBy({
    by: ['method'],
    where: { branchId, paidAt: { gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    _sum: { amount: true },
    _count: true,
  });

  const totalRevenue = paymentBreakdownRaw.reduce((s, p) => s + (p._sum.amount ?? 0), 0);

  const paymentBreakdown = paymentBreakdownRaw.map((p) => ({
    method: p.method,
    total: p._sum.amount ?? 0,
    count: p._count,
    percent: totalRevenue > 0 ? ((p._sum.amount ?? 0) / totalRevenue) * 100 : 0,
  }));

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Analitik</h1>
        <p className="text-brand-navy/60">Tren 7 hari terakhir & breakdown pembayaran</p>
      </div>
      <AnalyticsCharts dailyData={dailyData} paymentBreakdown={paymentBreakdown} />
    </DashboardShell>
  );
}
