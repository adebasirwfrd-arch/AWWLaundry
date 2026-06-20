'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { isOrderCompleted } from '@/lib/order-journey';
import { notifyBranchRoles } from '@/lib/notify';

export async function submitOrderReview(input: {
  orderId: string;
  rating: number;
  note?: string;
}) {
  const session = await requireAuth([Role.CUSTOMER]);
  const rating = Math.round(input.rating);

  if (rating < 1 || rating > 5) throw new Error('Rating harus 1–5 bintang');

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!customer) throw new Error('Data pelanggan tidak ditemukan');

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      branchId: true,
      customerId: true,
      orderNumber: true,
      status: true,
      review: { select: { id: true } },
    },
  });

  if (!order || order.customerId !== customer.id) {
    throw new Error('Pesanan tidak ditemukan');
  }
  if (!isOrderCompleted(order.status)) {
    throw new Error('Review hanya bisa diberikan setelah pesanan selesai');
  }
  if (order.review) {
    throw new Error('Anda sudah memberikan review untuk pesanan ini');
  }

  const note = input.note?.trim() || null;

  const review = await prisma.orderReview.create({
    data: {
      orderId: order.id,
      customerId: customer.id,
      rating,
      note,
    },
  });

  const notePreview = note ? (note.length > 80 ? `${note.slice(0, 80)}…` : note) : 'Tanpa catatan';

  await notifyBranchRoles({
    branchId: order.branchId,
    roles: [Role.OWNER, Role.WORKER, Role.CASHIER, Role.MANAGER],
    type: 'ORDER_REVIEW',
    title: `Ulasan baru · ${'⭐'.repeat(rating)}`,
    body: `${customer.name} · ${order.orderNumber} · ${notePreview}`,
    data: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      reviewId: review.id,
      rating,
      note: note ?? '',
    },
  });

  revalidatePath('/customer/history');
  revalidatePath(`/customer/orders/${order.orderNumber}`);
  revalidatePath('/cashier/inbox');
  revalidatePath('/owner');

  return { ok: true };
}
