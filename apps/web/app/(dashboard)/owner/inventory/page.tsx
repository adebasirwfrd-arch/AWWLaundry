import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { prisma } from '@aww/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@aww/shared';
import { Package, AlertTriangle } from 'lucide-react';

export default async function InventoryPage() {
  const session = await requireAuth([Role.OWNER, Role.MANAGER]);

  const items = await prisma.inventoryItem.findMany({
    where: { branchId: session.user.branchId },
    orderBy: { name: 'asc' },
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Stok & Opname</h1>
        <p className="text-brand-navy/60">Kelola inventori — cocokkan stok dengan uang kas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const low = item.currentStock <= item.minStock;
          return (
            <Card key={item.id} className={low ? 'border-amber-400' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-brand-navy">{item.name}</p>
                    <p className="text-sm text-brand-navy/50">{item.unit}</p>
                  </div>
                  {low ? (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  ) : (
                    <Package className="h-5 w-5 text-rainbow-green" />
                  )}
                </div>
                <p className="mt-4 font-display text-2xl font-bold text-brand-navy">
                  {item.currentStock}
                </p>
                <p className="text-xs text-brand-navy/50">Min: {item.minStock}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Rekonsiliasi Kas Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-brand-navy/60">
            Stock opname memungkinkan pencocokan uang kas fisik dengan penerimaan sistem.
            Fitur opname lengkap tersedia di Phase 2.
          </p>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
