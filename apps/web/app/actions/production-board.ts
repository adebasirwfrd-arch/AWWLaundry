'use server';

import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';

const BOARD_ROLES = [Role.WORKER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.CASHIER];

function isOwnerLike(role: Role): boolean {
  return role === Role.OWNER || role === Role.SUPER_ADMIN;
}

async function assertBranchAccess(branchId: string) {
  const session = await requireAuth(BOARD_ROLES);
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: session.user.organizationId, isActive: true },
    select: { id: true, name: true, code: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  if (!isOwnerLike(session.user.role) && session.user.branchId !== branchId) {
    throw new Error('Tidak punya akses ke cabang ini');
  }

  return { session, branch };
}

export async function listProductionBoardBranches() {
  const session = await requireAuth(BOARD_ROLES);
  if (!isOwnerLike(session.user.role)) {
    return [
      {
        id: session.user.branchId,
        name: session.user.branchName,
        code: '',
      },
    ];
  }

  return prisma.branch.findMany({
    where: { organizationId: session.user.organizationId, isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  });
}

export async function getProductionBoardData(branchId: string) {
  const { branch } = await assertBranchAccess(branchId);

  const [orders, machines] = await Promise.all([
    prisma.order.findMany({
      where: {
        branchId,
        paymentStatus: 'PAID',
        status: { notIn: ['ON_HOLD', 'PICKED_UP', 'DELIVERED', 'CANCELLED'] },
      },
      include: { customer: true, serviceType: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.machine.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    }),
  ]);

  return {
    branch,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      weightKg: o.weightKg,
      total: o.total,
      customer: { name: o.customer.name, phone: o.customer.phone },
      serviceType: { name: o.serviceType.name },
    })),
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      status: m.status,
    })),
  };
}
