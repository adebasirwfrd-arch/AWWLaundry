import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { CashflowPageClient } from '@/components/cashflow/cashflow-page-client';
import { getCashflowData } from '@/app/actions/cashflow';

export default async function CashierCashflowPage() {
  const session = await requireAuth([Role.CASHIER]);
  const branchId = session.user.branchId;

  const data = await getCashflowData({
    period: 'month',
    branchId,
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Cashflow</h1>
        <p className="text-brand-navy/60">
          Pemasukan & pengeluaran cabang {session.user.branchName} — CAPEX, OPEX, analitik lengkap
        </p>
      </div>
      <CashflowPageClient
        initialData={data}
        showBranchFilter={false}
        defaultBranchId={branchId}
      />
    </DashboardShell>
  );
}
