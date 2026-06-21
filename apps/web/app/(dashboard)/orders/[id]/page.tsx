import Link from 'next/link';
import { Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { OrderDetailView } from '@/components/orders/order-detail-view';
import { getOrderDetailForStaff } from '@/app/actions/owner-orders';
import { ArrowLeft } from 'lucide-react';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth([
    Role.OWNER,
    Role.SUPER_ADMIN,
    Role.MANAGER,
    Role.CASHIER,
    Role.WORKER,
  ]);
  const { id } = await params;

  const order = await getOrderDetailForStaff(id);

  const ordersListHref =
    session.user.role === Role.CASHIER
      ? '/cashier/orders'
      : session.user.role === Role.WORKER
        ? '/worker'
        : session.user.role === Role.OWNER ||
            session.user.role === Role.SUPER_ADMIN ||
            session.user.role === Role.MANAGER
          ? '/owner/orders'
          : '/owner';

  if (!order) {
    return (
      <DashboardShell user={session.user}>
        <p className="text-brand-navy/60">Pesanan tidak ditemukan.</p>
        <Link href={ordersListHref} className="mt-4 inline-flex items-center gap-2 text-sm text-rainbow-cyan">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Order
        </Link>
      </DashboardShell>
    );
  }

  const backHref = ordersListHref;

  return (
    <DashboardShell user={session.user}>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-brand-navy/60 hover:text-brand-navy">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>
      <OrderDetailView order={order} />
    </DashboardShell>
  );
}
