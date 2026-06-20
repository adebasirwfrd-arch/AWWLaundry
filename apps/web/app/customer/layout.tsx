import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { CustomerAppShell } from '@/components/customer/customer-app-shell';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth([Role.CUSTOMER]);
  const [user, customer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    prisma.customer.findUnique({
      where: { userId: session.user.id },
      select: { loyaltyPoints: true, name: true },
    }),
  ]);

  return (
    <CustomerAppShell
      user={{ name: customer?.name ?? user?.name ?? session.user.name, email: user?.email ?? session.user.email }}
      loyaltyPoints={customer?.loyaltyPoints ?? 0}
    >
      {children}
    </CustomerAppShell>
  );
}
