import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OwnerDashboardClient } from '@/components/dashboard/owner-dashboard-client';
import { getOwnerDashboardMetrics, listOrgBranches } from '@/app/actions/branch-admin';

export default async function OwnerPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
  const branchScoped = session.user.role === Role.MANAGER;

  const [branches, initialData] = await Promise.all([
    listOrgBranches(),
    getOwnerDashboardMetrics({
      period: 'today',
      paymentMethod: 'ALL',
      branchId: branchScoped ? session.user.branchId : undefined,
    }),
  ]);

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Dashboard</h1>
        <p className="text-brand-navy/60">
          {branchScoped
            ? `Ringkasan operasional cabang ${session.user.branchName}`
            : 'Ringkasan operasional — filter per cabang, periode, dan metode pembayaran'}
        </p>
      </div>
      <OwnerDashboardClient
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        initialData={initialData}
        showBranchFilter={!branchScoped}
        branchLabel={session.user.branchName}
        defaultBranchId={branchScoped ? session.user.branchId : ''}
      />
    </DashboardShell>
  );
}
