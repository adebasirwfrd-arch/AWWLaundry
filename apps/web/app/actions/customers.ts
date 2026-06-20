'use server';

import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { periodRange, type DashboardPeriod } from '@/lib/date-buckets';

function isBranchScoped(role: Role): boolean {
  return role === Role.CASHIER || role === Role.MANAGER;
}

export type CustomerPeriodFilter = DashboardPeriod | 'all';

export interface CustomerListFilters {
  branchId?: string;
  period?: CustomerPeriodFilter;
  search?: string;
  serviceTypeId?: string;
}

export async function listCustomers(filters: CustomerListFilters = {}) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER]);
  const branchScoped = isBranchScoped(session.user.role);
  const effectiveBranchId = branchScoped ? session.user.branchId : filters.branchId || undefined;
  const period = filters.period ?? 'all';
  const range = period === 'all' ? null : periodRange(period);
  const search = filters.search?.trim();

  const orderScopeWhere = {
    ...(effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    ...(range ? { createdAt: { gte: range.start, lte: range.end } } : {}),
    ...(filters.serviceTypeId ? { serviceTypeId: filters.serviceTypeId } : {}),
  };

  const hasOrderScope = Object.keys(orderScopeWhere).length > 0;

  const [customers, branches, serviceTypes] = await Promise.all([
    prisma.customer.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(hasOrderScope ? { orders: { some: orderScopeWhere } } : {}),
      },
      include: {
        orders: {
          where: hasOrderScope ? orderScopeWhere : effectiveBranchId ? { branchId: effectiveBranchId } : undefined,
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            branch: { select: { name: true, code: true } },
            serviceType: { select: { name: true } },
          },
        },
        _count: {
          select: {
            orders: hasOrderScope
              ? { where: orderScopeWhere }
              : effectiveBranchId
                ? { where: { branchId: effectiveBranchId } }
                : true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    branchScoped
      ? Promise.resolve([])
      : prisma.branch.findMany({
          where: { organizationId: session.user.organizationId, isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
    prisma.serviceType.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return {
    branchScoped,
    showBranchFilter: !branchScoped,
    branchName: session.user.branchName,
    branches,
    serviceTypes,
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
