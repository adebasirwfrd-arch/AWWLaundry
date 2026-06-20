import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OwnerOrdersList } from '@/components/orders/owner-orders-list';
import { listOwnerOrders } from '@/app/actions/owner-orders';

export default async function OwnerOrdersPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
  const showBranchFilter = session.user.role !== Role.MANAGER;

  const data = await listOwnerOrders({
    period: 'month',
    statusGroup: 'ALL',
    progress: 'ALL',
    paymentMethod: 'ALL',
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Order</h1>
        <p className="text-brand-navy/60">
          Semua pesanan {showBranchFilter ? 'dari tiap cabang' : `cabang ${session.user.branchName}`} — filter lengkap & detail per order
        </p>
      </div>
      <OwnerOrdersList
        initialOrders={data.orders}
        branches={data.branches}
        serviceTypes={data.serviceTypes}
        showBranchFilter={showBranchFilter}
      />
    </DashboardShell>
  );
}
