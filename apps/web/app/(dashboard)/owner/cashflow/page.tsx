import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CashflowPageClient } from '@/components/cashflow/cashflow-page-client';
import { getCashflowData } from '@/app/actions/cashflow';

export default async function CashflowPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
  const showBranchFilter = session.user.role !== Role.MANAGER;
  const managerBranchId = session.user.role === Role.MANAGER ? session.user.branchId : undefined;

  const data = await getCashflowData({
    period: 'month',
    branchId: managerBranchId,
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Cashflow</h1>
        <p className="text-brand-navy/60">
          Pemasukan & pengeluaran {showBranchFilter ? 'semua cabang' : session.user.branchName} — CAPEX, OPEX, analitik lengkap
        </p>
      </div>
      <CashflowPageClient
        initialData={data}
        showBranchFilter={showBranchFilter}
        defaultBranchId={managerBranchId}
      />
    </DashboardShell>
  );
}
