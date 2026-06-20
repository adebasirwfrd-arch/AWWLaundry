import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { CustomerProfileCard } from '@/components/customer/customer-profile-card';

function displayPhone(phone: string | null | undefined): string {
  if (!phone || phone.startsWith('USR-')) return '';
  return phone;
}

export default async function CustomerProfilePage() {
  const session = await requireAuth([Role.CUSTOMER]);

  const [user, customer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, avatarUrl: true },
    }),
    prisma.customer.findUnique({
      where: { userId: session.user.id },
      select: {
        name: true,
        phone: true,
        email: true,
        address: true,
        loyaltyPoints: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  const name = customer?.name ?? user?.name ?? session.user.name ?? 'Pelanggan';
  const phone = displayPhone(customer?.phone ?? user?.phone);

  return (
    <CustomerProfileCard
      profile={{
        name,
        email: customer?.email ?? user?.email ?? session.user.email ?? '',
        phone,
        address: customer?.address ?? '',
        avatarUrl: user?.avatarUrl ?? null,
        loyaltyPoints: customer?.loyaltyPoints ?? 0,
        orderCount: customer?._count.orders ?? 0,
      }}
    />
  );
}
