'use server';

import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';

function isBranchScoped(role: Role): boolean {
  return role === Role.CASHIER || role === Role.MANAGER;
}

export async function listCustomers() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER]);
  const branchScoped = isBranchScoped(session.user.role);
  const branchId = branchScoped ? session.user.branchId : undefined;
  const orderWhere = branchId ? { branchId } : undefined;

  const customers = await prisma.customer.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(branchId ? { orders: { some: { branchId } } } : {}),
    },
    include: {
      orders: {
        where: orderWhere,
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          branch: { select: { name: true, code: true } },
          serviceType: { select: { name: true } },
        },
      },
      _count: {
        select: {
          orders: orderWhere ? { where: orderWhere } : true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return {
    branchScoped,
    branchName: session.user.branchName,
    customers: customers.map((c) => {
      const last = c.orders[0];
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        loyaltyPoints: c.loyaltyPoints,
        orderCount: c._count.orders,
        branchName: last?.branch.name ?? null,
        lastOrderAt: last?.createdAt.toISOString() ?? null,
        lastServiceName: last?.serviceType.name ?? null,
      };
    }),
  };
}
