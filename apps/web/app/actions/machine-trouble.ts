'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createNotification } from '@/lib/notify';

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
