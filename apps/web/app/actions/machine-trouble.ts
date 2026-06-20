'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import { createNotification } from '@/lib/notify';

export type MachineResolutionType = 'REPAIRED' | 'REPLACED';

const RESOLUTION_LABELS: Record<MachineResolutionType, string> = {
  REPAIRED: 'Diperbaiki',
  REPLACED: 'Diganti',
};

export async function resolveMachineTrouble(machineId: string, resolution: MachineResolutionType) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN]);

  const machine = await prisma.machine.findFirst({
    where: {
      id: machineId,
      status: 'TROUBLE',
      branch: { organizationId: session.user.organizationId },
    },
    include: { branch: { select: { id: true, name: true } } },
  });
  if (!machine) throw new Error('Mesin tidak ditemukan atau tidak dalam status gangguan');

  const label = RESOLUTION_LABELS[resolution];
  const note = `${label} — mesin kembali aktif.`;

  const latestTrouble = await prisma.machineLog.findFirst({
    where: {
      machineId,
      eventType: 'TROUBLE_REPORTED',
      resolvedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, reportedById: true },
  });

  await prisma.$transaction([
    prisma.machine.update({
      where: { id: machineId },
      data: { status: 'IDLE' },
    }),
    ...(latestTrouble
      ? [
          prisma.machineLog.update({
            where: { id: latestTrouble.id },
            data: { resolvedAt: new Date() },
          }),
        ]
      : []),
    prisma.machineLog.create({
      data: {
        machineId,
        eventType: 'TROUBLE_RESOLVED',
        reportedById: session.user.id,
        note,
      },
    }),
  ]);

  await createAuditLog(
    { organizationId: session.user.organizationId, branchId: machine.branchId, userId: session.user.id },
    'MACHINE_RESOLVED',
    'Machine',
    machineId,
    { status: 'TROUBLE' },
    { status: 'IDLE', resolution, machineName: machine.name }
  );

  if (latestTrouble?.reportedById && latestTrouble.reportedById !== session.user.id) {
    await createNotification({
      userId: latestTrouble.reportedById,
      type: 'MACHINE_TROUBLE_REPLY',
      title: `${machine.name} sudah ${label.toLowerCase()}`,
      body: `Owner menandai mesin kembali aktif (${label.toLowerCase()}).`,
      data: { machineId, machineName: machine.name, resolution },
    });
  }

  revalidatePath('/worker');
  revalidatePath('/owner');
  revalidatePath('/cashier/inbox');
  revalidatePath('/owner/audit-trail');

  return { ok: true, status: 'IDLE' as const };
}

export async function replyMachineTrouble(machineLogId: string, body: string) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN]);
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Komentar wajib diisi');

  const log = await prisma.machineLog.findFirst({
    where: {
      id: machineLogId,
      eventType: 'TROUBLE_REPORTED',
      machine: { branch: { organizationId: session.user.organizationId } },
    },
    include: {
      machine: { select: { id: true, name: true, branchId: true } },
      reportedBy: { select: { id: true, name: true } },
    },
  });
  if (!log) throw new Error('Laporan tidak ditemukan');
  if (!log.reportedById) throw new Error('Pelapor tidak ditemukan');

  await prisma.machineTroubleComment.create({
    data: {
      machineLogId,
      authorId: session.user.id,
      body: trimmed,
    },
  });

  await createNotification({
    userId: log.reportedById,
    type: 'MACHINE_TROUBLE_REPLY',
    title: `Balasan owner: ${log.machine.name}`,
    body: trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed,
    data: {
      machineLogId,
      machineId: log.machine.id,
      machineName: log.machine.name,
    },
  });

  revalidatePath('/cashier/inbox');
  return { ok: true };
}
