import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AuditTrailClient } from '@/components/audit/audit-trail-client';
import { listAuditTrail } from '@/app/actions/audit-trail';

export default async function OwnerAuditTrailPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN]);
  const data = await listAuditTrail({ period: 'month' });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-brand-navy">Audit Trail</h1>
        <p className="text-brand-navy/60">
          Jejak aktivitas kasir dan pekerja — order, pembayaran, stok, pengeluaran, dan perubahan lain di aplikasi.
        </p>
      </div>
      <AuditTrailClient
        initialRows={data.rows}
        branches={data.branches}
        initialCursor={data.nextCursor}
      />
    </DashboardShell>
  );
}
