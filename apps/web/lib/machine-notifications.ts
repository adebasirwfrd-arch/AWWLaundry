import { prisma, Role } from '@aww/database';
import { getAppUrl, getOwnerNotificationEmail } from '@/lib/env';
import { sendMachineTroubleEmail } from '@/lib/brevo';
import { notifyBranchRoles } from '@/lib/notify';

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

export async function notifyMachineTroubleReported(params: {
  machineId: string;
  machineName: string;
  machineType: string;
  branchId: string;
  branchName: string;
  note: string;
  reportedByName: string;
  reportedById: string;
}) {
  const appUrl = getAppUrl();
  const inboxUrl = `${appUrl}/cashier/inbox#mesin`;

  await notifyBranchRoles({
    branchId: params.branchId,
    roles: [Role.OWNER, Role.SUPER_ADMIN],
    type: 'MACHINE_TROUBLE',
    title: `Gangguan mesin: ${params.machineName}`,
    body: `${params.reportedByName} melaporkan masalah — ${params.note}`,
    data: {
      machineId: params.machineId,
      branchId: params.branchId,
      machineName: params.machineName,
      note: params.note,
    },
    excludeUserId: params.reportedById,
  });

  const emailed = new Set<string>();
  const defaultOwnerEmail = getOwnerNotificationEmail();
  if (defaultOwnerEmail) {
    emailed.add(defaultOwnerEmail);
    void sendMachineTroubleEmail({
      to: defaultOwnerEmail,
      name: 'Owner AWW Laundry',
      machineName: params.machineName,
      machineType: params.machineType,
      branchName: params.branchName,
      reportedBy: params.reportedByName,
      note: params.note,
      inboxUrl,
    }).catch(console.error);
  }

  const owners = await getBranchOwners(params.branchId);
  for (const owner of owners) {
    if (!owner.email || emailed.has(owner.email)) continue;
    emailed.add(owner.email);
    void sendMachineTroubleEmail({
      to: owner.email,
      name: owner.name,
      machineName: params.machineName,
      machineType: params.machineType,
      branchName: params.branchName,
      reportedBy: params.reportedByName,
      note: params.note,
      inboxUrl,
    }).catch(console.error);
  }
}
