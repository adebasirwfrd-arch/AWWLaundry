'use server';

import { Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { fetchOwnerFullAnalytics, type PaymentFilter } from '@/lib/owner-full-analytics';
import type { DashboardPeriod } from '@/lib/date-buckets';

export async function getOwnerAnalytics(input: {
  branchId?: string;
  period: DashboardPeriod;
  paymentMethod: PaymentFilter;
}) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER]);
  const branchScoped = session.user.role === Role.MANAGER;

  return fetchOwnerFullAnalytics({
    organizationId: session.user.organizationId,
    branchId: branchScoped ? session.user.branchId : input.branchId || undefined,
    period: input.period,
    paymentMethod: input.paymentMethod,
  });
}
