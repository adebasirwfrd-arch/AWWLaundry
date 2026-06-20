import { Suspense } from 'react';
import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { InventoryDashboard } from '@/components/inventory/inventory-dashboard';
import {
  getInventorySummary,
  listInventoryItems,
  listStockMovements,
  listStockOpnames,
} from '@/app/actions/inventory';
import { listOrgBranches } from '@/app/actions/branch-admin';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const session = await requireAuth([Role.OWNER, Role.MANAGER]);
  const params = await searchParams;
  const branches = await listOrgBranches();
  const branchId = params.branch ?? session.user.branchId;

  const [items, movements, opnames, summary] = await Promise.all([
    listInventoryItems(branchId),
    listStockMovements(branchId),
    listStockOpnames(branchId),
    getInventorySummary(branchId),
  ]);

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Stok & Opname</h1>
        <p className="text-brand-navy/60">
          Inventori lengkap — master stok, pergerakan, opname berkala, rekonsiliasi kas
        </p>
      </div>

      <Suspense fallback={<p className="text-brand-navy/60">Memuat inventori...</p>}>
        <InventoryDashboard
          branches={branches}
          initialBranchId={branchId}
          items={items}
          movements={movements}
          opnames={opnames}
          summary={summary}
        />
      </Suspense>
    </DashboardShell>
  );
}
