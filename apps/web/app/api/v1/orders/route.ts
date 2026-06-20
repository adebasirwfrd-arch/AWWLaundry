import { NextResponse } from 'next/server';
import { prisma } from '@aww/database';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const branchId = session.user.branchId;

  const orders = await prisma.order.findMany({
    where: {
      branchId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      customer: true,
      serviceType: true,
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(orders);
}
