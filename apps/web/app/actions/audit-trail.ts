'use server';

import { prisma, Role, AuditAction } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { formatAuditRow } from '@/lib/audit-labels';

const OWNER_ROLES = [Role.OWNER, Role.SUPER_ADMIN];

export type AuditTrailPeriod = 'today' | 'week' | 'month' | 'all';
export type AuditStaffRole = 'ALL' | 'CASHIER' | 'WORKER';

export type AuditTrailRow = ReturnType<typeof formatAuditRow>;

function periodStart(period: AuditTrailPeriod): Date | undefined {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return start;
  }
  if (period === 'month') {
    const start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  return undefined;
}

export async function listAuditTrail(input: {
  branchId?: string;
  staffRole?: AuditStaffRole;
  action?: AuditAction | 'ALL';
  period?: AuditTrailPeriod;
  search?: string;
  cursor?: string;
  limit?: number;
}) {
  const session = await requireAuth(OWNER_ROLES);
  const limit = Math.min(input.limit ?? 40, 100);
  const staffRoles =
    !input.staffRole || input.staffRole === 'ALL'
      ? [Role.CASHIER, Role.WORKER]
      : [input.staffRole];
  const start = periodStart(input.period ?? 'month');
  const search = input.search?.trim();

  const rows = await prisma.auditLog.findMany({
    where: {
      organizationId: session.user.organizationId,
      ...(input.branchId ? { branchId: input.branchId } : {}),
      ...(input.action && input.action !== 'ALL' ? { action: input.action } : {}),
      ...(start ? { createdAt: { gte: start } } : {}),
      userId: { not: null },
      user: {
        branchRoles: {
          some: {
            role: { in: staffRoles },
            ...(input.branchId ? { branchId: input.branchId } : {}),
          },
        },
      },
      ...(search
        ? {
            OR: [
              { entityType: { contains: search, mode: 'insensitive' } },
              { entityId: { contains: search, mode: 'insensitive' } },
              { newValue: { contains: search, mode: 'insensitive' } },
              { oldValue: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { branch: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          branchRoles: { select: { role: true, branchId: true } },
        },
      },
      branch: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...(input.cursor
      ? {
          cursor: { id: input.cursor },
          skip: 1,
          take: limit + 1,
        }
      : { take: limit + 1 }),
  });

  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;

  const branches = await prisma.branch.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  });

  return {
    rows: slice.map(formatAuditRow),
    nextCursor: hasMore ? slice[slice.length - 1]?.id ?? null : null,
    branches,
  };
}
