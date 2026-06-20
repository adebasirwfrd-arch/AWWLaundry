import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { POSPanel } from '@/components/pos/pos-panel';
import { prisma } from '@aww/database';

export default async function CashierPage() {
  const session = await requireAuth([Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN]);

  const services = await prisma.serviceType.findMany({
    where: { organizationId: session.user.organizationId, isActive: true },
    orderBy: { pricePerKg: 'asc' },
  });

  const branchPricing = await prisma.branchPricing.findMany({
    where: { branchId: session.user.branchId },
  });

  const branch = await prisma.branch.findUnique({
    where: { id: session.user.branchId },
    select: { phone: true },
  });

  const servicesWithPrice = services.map((s) => {
    const bp = branchPricing.find((p) => p.serviceTypeId === s.id);
    return { id: s.id, name: s.name, pricePerKg: bp?.pricePerKg ?? s.pricePerKg };
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">POS Kasir</h1>
        <p className="text-brand-navy/60">Timbang → Catat → Print struk otomatis · {session.user.branchName}</p>
      </div>
      <POSPanel
        services={servicesWithPrice}
        branchName={session.user.branchName}
        branchPhone={branch?.phone ?? undefined}
      />
    </DashboardShell>
  );
}
