import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { WorkerBoard } from '@/components/worker/worker-board';
import { prisma } from '@aww/database';

export default async function WorkerPage() {
  const session = await requireAuth([Role.WORKER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.CASHIER]);

  const [orders, machines] = await Promise.all([
    prisma.order.findMany({
      where: {
        branchId: session.user.branchId,
        paymentStatus: 'PAID',
        status: { notIn: ['ON_HOLD', 'PICKED_UP', 'DELIVERED', 'CANCELLED'] },
      },
      include: { customer: true, serviceType: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.machine.findMany({
      where: { branchId: session.user.branchId },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Board Produksi</h1>
        <p className="text-brand-navy/60">Update status cucian — cuci, setrika, lipat</p>
      </div>
      <WorkerBoard orders={orders} machines={machines} />
    </DashboardShell>
  );
}
