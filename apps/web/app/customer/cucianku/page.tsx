import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { CuciankuDashboard } from '@/components/customer/cucianku-dashboard';
import { monthKeyFromDate, type CuciankuOrder } from '@/lib/customer-analytics';

export default async function CuciankuPage() {
  const session = await requireAuth([Role.CUSTOMER]);

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true, loyaltyPoints: true },
  });

  const orders = customer
    ? await prisma.order.findMany({
        where: { customerId: customer.id, status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        include: {
          serviceType: { select: { name: true } },
          review: { select: { rating: true } },
        },
      })
    : [];

  const cuciankuOrders: CuciankuOrder[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    serviceName: o.serviceType.name,
    weightKg: o.weightKg,
    total: o.total,
    status: o.status,
    monthKey: monthKeyFromDate(o.createdAt),
    createdAt: o.createdAt.toISOString(),
    loyaltyPointsEarned: o.loyaltyPointsEarned,
    loyaltyPointsRedeemed: o.loyaltyPointsRedeemed,
    rating: o.review?.rating ?? null,
    paid: o.paymentStatus === 'PAID',
  }));

  return (
    <CuciankuDashboard
      orders={cuciankuOrders}
      loyaltyPoints={customer?.loyaltyPoints ?? 0}
      customerName={customer?.name ?? session.user.name ?? 'Pelanggan'}
    />
  );
}
