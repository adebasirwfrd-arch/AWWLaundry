import { prisma, Role } from '@aww/database';
import { formatCurrency } from '@aww/shared';
import { getAppUrl, getOwnerNotificationEmail } from '@/lib/env';
import { sendStockOpnamePendingEmail } from '@/lib/brevo';
import { createNotification, notifyBranchRoles } from '@/lib/notify';

async function getBranchOwners(branchId: string) {
  const rows = await prisma.userBranchRole.findMany({
    where: { branchId, role: { in: [Role.OWNER, Role.SUPER_ADMIN] } },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  const seen = new Set<string>();
  return rows
    .map((r) => r.user)
    .filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
}

export async function notifyOpnameSubmittedForApproval(params: {
  opnameId: string;
  branchId: string;
  branchName: string;
  submittedByName: string;
  lineCount: number;
  totalVarianceCost: number;
  cashVariance: number | null;
  excludeUserId?: string;
}) {
  const owners = await getBranchOwners(params.branchId);
  const appUrl = getAppUrl();
  const inboxUrl = `${appUrl}/cashier/inbox?opname=${params.opnameId}#opname`;
  const periodLabel = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const title = 'Stock opname menunggu persetujuan';
  const body = `${params.submittedByName} mengajukan opname ${params.branchName} — ${params.lineCount} item, selisih nilai ${formatCurrency(params.totalVarianceCost)}`;

  await notifyBranchRoles({
    branchId: params.branchId,
    roles: [Role.OWNER, Role.SUPER_ADMIN],
    type: 'STOCK_OPNAME_PENDING',
    title,
    body,
    data: { opnameId: params.opnameId, branchId: params.branchId },
    excludeUserId: params.excludeUserId,
  });

  const emailed = new Set<string>();

  const defaultOwnerEmail = getOwnerNotificationEmail();
  if (defaultOwnerEmail && !emailed.has(defaultOwnerEmail)) {
    emailed.add(defaultOwnerEmail);
    void sendStockOpnamePendingEmail({
      to: defaultOwnerEmail,
      name: 'Owner AWW Laundry',
      branchName: params.branchName,
      submittedBy: params.submittedByName,
      periodLabel,
      lineCount: params.lineCount,
      totalVarianceCost: params.totalVarianceCost,
      cashVariance: params.cashVariance,
      inboxUrl,
    }).catch((err) => console.error('[Opname email]', err));
  }

  for (const owner of owners) {
    if (owner.id === params.excludeUserId || emailed.has(owner.email)) continue;
    emailed.add(owner.email);
    void sendStockOpnamePendingEmail({
      to: owner.email,
      name: owner.name,
      branchName: params.branchName,
      submittedBy: params.submittedByName,
      periodLabel,
      lineCount: params.lineCount,
      totalVarianceCost: params.totalVarianceCost,
      cashVariance: params.cashVariance,
      inboxUrl,
    }).catch((err) => console.error('[Opname email]', err));
  }
}

export async function notifyOpnameApproved(params: {
  branchId: string;
  opnameId: string;
  approvedByName: string;
  createdById?: string | null;
}) {
  if (!params.createdById) return;

  await createNotification({
    userId: params.createdById,
    type: 'STOCK_OPNAME_APPROVED',
    title: 'Stock opname disetujui ✅',
    body: `Opname Anda telah disetujui oleh ${params.approvedByName}. Stok telah disesuaikan.`,
    data: { opnameId: params.opnameId, branchId: params.branchId },
  });
}

export async function notifyOpnameRejected(params: {
  branchId: string;
  opnameId: string;
  rejectedByName: string;
  reason?: string;
  createdById?: string | null;
}) {
  if (!params.createdById) return;

  await createNotification({
    userId: params.createdById,
    type: 'STOCK_OPNAME_REJECTED',
    title: 'Stock opname ditolak',
    body: `Opname ditolak oleh ${params.rejectedByName}${params.reason ? `: ${params.reason}` : '.'}`,
    data: { opnameId: params.opnameId, branchId: params.branchId },
  });
}

export async function notifyOpnameRevisionRequested(params: {
  branchId: string;
  opnameId: string;
  requestedByName: string;
  note: string;
  createdById?: string | null;
}) {
  if (!params.createdById) return;

  await createNotification({
    userId: params.createdById,
    type: 'STOCK_OPNAME_REVISION',
    title: 'Stock opname perlu revisi',
    body: `${params.requestedByName} meminta revisi: ${params.note}`,
    data: { opnameId: params.opnameId, branchId: params.branchId },
  });
}
