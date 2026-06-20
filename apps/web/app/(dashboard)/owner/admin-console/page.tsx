import { prisma } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { AdminConsole } from '@/components/admin/admin-console';
import { loadAdminConsoleData } from '@/app/actions/admin-console';

export default async function AdminConsolePage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN]);
  const [data, org] = await Promise.all([
    loadAdminConsoleData(),
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { name: true },
    }),
  ]);

  return (
    <DashboardShell user={session.user}>
      <AdminConsole data={data} orgName={org?.name ?? 'AWW Laundry'} />
    </DashboardShell>
  );
}
