import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { listCustomers } from '@/app/actions/customers';
import { CustomersPageClient } from '@/components/customers/customers-page-client';

export default async function CustomersPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER]);
  const data = await listCustomers();

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Pelanggan</h1>
        <p className="text-brand-navy/60">
          {data.branchScoped
            ? `Daftar pelanggan yang pernah transaksi di cabang ${data.branchName}`
            : 'Daftar pelanggan terdaftar dari semua cabang'}
        </p>
      </div>

      <CustomersPageClient
        initialCustomers={data.customers}
        branches={data.branches}
        serviceTypes={data.serviceTypes}
        showBranchFilter={data.showBranchFilter}
        branchLabel={data.branchName}
      />
    </DashboardShell>
  );
}
