import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { WorkerBoard } from '@/components/worker/worker-board';
import {
  getProductionBoardData,
  listProductionBoardBranches,
} from '@/app/actions/production-board';
import { isOwnerLikeRole } from '@/lib/api-access-user';

export default async function WorkerPage() {
  const session = await requireAuth([Role.WORKER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.CASHIER]);
  const canPickBranch = isOwnerLikeRole(String(session.user.role));

  const branches = await listProductionBoardBranches();
  const defaultBranchId = canPickBranch
    ? (branches[0]?.id ?? session.user.branchId)
    : session.user.branchId;
  const data = await getProductionBoardData(defaultBranchId);

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Board Produksi</h1>
        <p className="text-brand-navy/60">
          {canPickBranch
            ? 'Update status cucian per cabang — cuci, setrika, lipat'
            : `Update status cucian cabang ${session.user.branchName} — cuci, setrika, lipat`}
        </p>
      </div>
      <WorkerBoard
        orders={data.orders}
        machines={data.machines}
        branches={branches}
        showBranchFilter={canPickBranch && branches.length > 0}
        canResolveMachines={canPickBranch}
        branchId={defaultBranchId}
        branchLabel={data.branch.name}
      />
    </DashboardShell>
  );
}
