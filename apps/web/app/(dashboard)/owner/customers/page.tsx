import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { prisma } from '@aww/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@aww/shared';

export default async function CustomersPage() {
  const session = await requireAuth([Role.OWNER, Role.MANAGER, Role.CASHIER]);

  const customers = await prisma.customer.findMany({
    where: { organizationId: session.user.organizationId },
    include: {
      orders: {
        select: { total: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { orders: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Pelanggan</h1>
        <p className="text-brand-navy/60">Daftar pelanggan terdaftar</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{customers.length} Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-aww-border text-left text-brand-navy/60">
                  <th className="pb-3 pr-4">Nama</th>
                  <th className="pb-3 pr-4">Telepon</th>
                  <th className="pb-3 pr-4">Total Order</th>
                  <th className="pb-3">Poin Loyalitas</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-aww-border/50">
                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                    <td className="py-3 pr-4">{c.phone}</td>
                    <td className="py-3 pr-4">{c._count.orders} order</td>
                    <td className="py-3">{c.loyaltyPoints} poin</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
