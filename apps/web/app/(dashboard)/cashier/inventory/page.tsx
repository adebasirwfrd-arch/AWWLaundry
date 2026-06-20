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

export default async function CashierInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; step?: string }>;
}) {
  const session = await requireAuth([Role.CASHIER]);
  const params = await searchParams;
  const branchId = session.user.branchId;

  const [items, movements, opnames, summary] = await Promise.all([
    listInventoryItems(branchId),
    listStockMovements(branchId),
    listStockOpnames(branchId),
    getInventorySummary(branchId),
  ]);

  const branchLabel = session.user.branchName ?? 'Cabang Anda';

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Stok & Opname</h1>
        <p className="text-brand-navy/60">
          Inventori cabang — {branchLabel}. Master stok, pergerakan, opname, dan rekonsiliasi kas.
        </p>
      </div>

      <Suspense fallback={<p className="text-brand-navy/60">Memuat inventori...</p>}>
        <InventoryDashboard
          key={branchId}
          branches={[]}
          initialBranchId={branchId}
          branchLabel={branchLabel}
          lockBranch
          items={items}
          movements={movements}
          opnames={opnames}
          summary={summary}
          userRole={session.user.role}
          defaultTab={params.tab as 'items' | 'movements' | 'opname' | 'history' | undefined}
          basePath="/cashier/inventory"
        />
      </Suspense>
    </DashboardShell>
  );
}
