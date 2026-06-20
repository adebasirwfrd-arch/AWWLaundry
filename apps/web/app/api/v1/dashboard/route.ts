import { NextResponse } from 'next/server';
import { prisma } from '@aww/database';
import { auth } from '@/lib/auth';
import { updateDailySummary } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const branchId = session.user.branchId;
  const metrics = await updateDailySummary(branchId);

  const pipeline = await prisma.order.groupBy({
    by: ['status'],
    where: { branchId, status: { notIn: ['PICKED_UP', 'DELIVERED', 'CANCELLED'] } },
    _count: true,
  });

  const recentOrders = await prisma.order.findMany({
    where: { branchId },
    include: { customer: true, serviceType: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const machines = await prisma.machine.findMany({
    where: { branchId },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ metrics, pipeline, recentOrders, machines });
}
