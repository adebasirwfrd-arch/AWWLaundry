import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { listCustomers } from '@/app/actions/customers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatLastTransactionDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function CustomersPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER]);
  const { customers, branchScoped, branchName } = await listCustomers();

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Pelanggan</h1>
        <p className="text-brand-navy/60">
          {branchScoped
            ? `Daftar pelanggan yang pernah transaksi di cabang ${branchName}`
            : 'Daftar pelanggan terdaftar dari semua cabang'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{customers.length} Pelanggan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-aww-border text-left text-brand-navy/60">
                  <th className="pb-3 pr-4">Nama</th>
                  <th className="pb-3 pr-4">Telepon</th>
                  <th className="pb-3 pr-4">Cabang</th>
                  <th className="pb-3 pr-4">Terakhir Transaksi</th>
                  <th className="pb-3 pr-4">Jumlah Transaksi</th>
                  <th className="pb-3 pr-4">Transaksi Terakhir</th>
                  <th className="pb-3">Poin Loyalitas</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-brand-navy/40">
                      Belum ada pelanggan
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="border-b border-aww-border/50">
                      <td className="py-3 pr-4 font-medium">{c.name}</td>
                      <td className="py-3 pr-4">{c.phone}</td>
                      <td className="py-3 pr-4">{c.branchName ?? '—'}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatLastTransactionDate(c.lastOrderAt)}
                      </td>
                      <td className="py-3 pr-4">{c.orderCount} transaksi</td>
                      <td className="py-3 pr-4">{c.lastServiceName ?? '—'}</td>
                      <td className="py-3">{c.loyaltyPoints} poin</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
