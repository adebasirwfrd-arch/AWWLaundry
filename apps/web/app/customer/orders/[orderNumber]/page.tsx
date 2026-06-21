import { notFound } from 'next/navigation';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { CustomerOrderDetail } from '@/components/customer/customer-order-detail';
import { parseCustomerPaymentFromNotes } from '@/lib/payment-plan';
import { resolveCustomerPaymentProofs, resolveOrderPaymentProofs } from '@/lib/payment-proof-url';
import { resolveTransferBankDetails } from '@/lib/branch-payment-settings';

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await requireAuth([Role.CUSTOMER]);

  const customer = await prisma.customer.findUnique({
    where: { userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!customer) notFound();

  const order = await prisma.order.findFirst({
    where: { orderNumber, customerId: customer.id },
    include: {
      serviceType: { select: { name: true } },
      branch: { select: { name: true, address: true, phone: true, settings: true } },
      statusLogs: { orderBy: { createdAt: 'asc' }, select: { toStatus: true, createdAt: true, note: true } },
      review: { select: { rating: true, note: true, createdAt: true } },
      payments: {
        orderBy: { paidAt: 'asc' },
        select: { method: true, amount: true, proofUrl: true, paidAt: true },
      },
    },
  });

  if (!order) notFound();

  const customerPayment = await resolveCustomerPaymentProofs(parseCustomerPaymentFromNotes(order.notes));
  const payments = await resolveOrderPaymentProofs(order.payments, order.notes);

  return (
    <CustomerOrderDetail
      order={{
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        weightKg: order.weightKg,
        total: order.total,
        estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? null,
        customerName: customer.name,
        serviceName: order.serviceType.name,
        branch: order.branch,
        bankDetails: resolveTransferBankDetails(order.branch.settings),
        statusLogs: order.statusLogs.map((l) => ({
          toStatus: l.toStatus,
          createdAt: l.createdAt.toISOString(),
          note: l.note,
        })),
        review: order.review
          ? {
              rating: order.review.rating,
              note: order.review.note,
              createdAt: order.review.createdAt.toISOString(),
            }
          : null,
        paid: order.paymentStatus === 'PAID',
        paymentStatus: order.paymentStatus,
        customerPayment,
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          proofUrl: p.proofUrl,
          paidAt: p.paidAt.toISOString(),
        })),
      }}
    />
  );
}
