import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { HistoryList } from '@/components/customer/history-list';

export default async function CustomerHistoryPage() {
  const session = await requireAuth([Role.CUSTOMER]);

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, phone: true },
  });

  const orders = customer
    ? await prisma.order.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: 'desc' },
        include: {
          serviceType: { select: { name: true } },
          branch: { select: { name: true, phone: true } },
          items: { select: { description: true, qty: true, total: true } },
          payments: { orderBy: { paidAt: 'desc' }, take: 1, select: { method: true } },
        },
      })
    : [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-extrabold text-brand-navy">Riwayat Pesanan</h1>
      <HistoryList
        customerName={customer?.name ?? 'Pelanggan'}
        customerPhone={customer?.phone && !customer.phone.startsWith('USR-') ? customer.phone : undefined}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          serviceName: o.serviceType.name,
          itemCount: o.items.reduce((s, it) => s + it.qty, 0),
          total: o.total,
          status: o.status,
          paid: o.paymentStatus === 'PAID',
          paymentMethod: o.payments[0]?.method,
          weightKg: o.weightKg,
          branchName: o.branch.name,
          branchPhone: o.branch.phone ?? undefined,
          estimatedReadyAt: o.estimatedReadyAt?.toISOString() ?? '',
          createdAt: o.createdAt.toISOString(),
          fromApp: o.fromApp,
          items: o.items.map((it) => ({ description: it.description, qty: it.qty, total: it.total })),
        }))}
      />
    </div>
  );
}
