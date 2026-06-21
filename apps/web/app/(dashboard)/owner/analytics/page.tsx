import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { getOwnerAnalytics } from '@/app/actions/analytics';
import { OwnerAnalyticsClient } from '@/components/analytics/owner-analytics-client';

export default async function AnalyticsPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
  const branchScoped = session.user.role === Role.MANAGER;
  const data = await getOwnerAnalytics({
    period: 'week',
    paymentMethod: 'ALL',
    branchId: branchScoped ? session.user.branchId : undefined,
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Analitik</h1>
        <p className="text-brand-navy/60">
          {branchScoped
            ? `Dashboard lengkap cabang ${session.user.branchName} — order, cashflow, produksi, rating, stok & pelanggan`
            : 'Dashboard lengkap order, cashflow, produksi, rating, stok & pelanggan'}
        </p>
      </div>

      <OwnerAnalyticsClient
        initialData={data}
        showBranchFilter={!branchScoped}
        branchLabel={session.user.branchName}
      />
    </DashboardShell>
  );
}
