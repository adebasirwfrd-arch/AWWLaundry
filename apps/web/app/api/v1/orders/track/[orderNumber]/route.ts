import { NextResponse } from 'next/server';
import { prisma } from '@aww/database';
import { auth } from '@/lib/auth';
import { isOrderCompleted } from '@/lib/order-journey';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const code = decodeURIComponent(orderNumber).trim();

  // Pickup request (Pesan Jemput) tracking codes start with PJ-
  if (code.toUpperCase().startsWith('PJ-')) {
    const pickup = await prisma.pickupRequest.findUnique({
      where: { trackingCode: code },
    });
    if (!pickup) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }
    const branch = pickup.branchId
      ? await prisma.branch.findUnique({
          where: { id: pickup.branchId },
          select: { name: true, phone: true, address: true },
        })
      : null;

    return NextResponse.json({
      kind: 'pickup',
      trackingCode: pickup.trackingCode,
      status: pickup.status,
      customerName: pickup.customerName,
      serviceName: pickup.serviceName,
      address: pickup.address,
      scheduleDate: pickup.scheduleDate,
      scheduleSlot: pickup.scheduleSlot,
      estimatedKg: pickup.estimatedKg,
      createdAt: pickup.createdAt,
      branch: branch ?? { name: 'AWW Laundry', phone: null, address: null },
    });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber: code },
    include: {
      customer: { select: { name: true, phone: true, userId: true } },
      serviceType: { select: { name: true, estimatedHours: true } },
      branch: { select: { name: true, address: true, phone: true } },
      statusLogs: {
        orderBy: { createdAt: 'asc' },
        include: { changedBy: { select: { name: true } } },
      },
      review: { select: { rating: true, note: true, createdAt: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  }

  const session = await auth();
  const canReview =
    !!session?.user?.id &&
    order.customer.userId === session.user.id &&
    order.paymentStatus === 'PAID' &&
    isOrderCompleted(order.status) &&
    !order.review;

  return NextResponse.json({
    kind: 'order',
    ...order,
    canReview,
    review: order.review
      ? { ...order.review, createdAt: order.review.createdAt.toISOString() }
      : null,
  });
}
