import Link from 'next/link';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PendingOrders } from '@/components/pos/pending-orders';
import { InboxReviews } from '@/components/inbox/inbox-reviews';
import { Inbox, MessageSquare, ArrowRight, Star } from 'lucide-react';

const INBOX_ROLES = [Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.WORKER];

export default async function CashierInboxPage() {
  const session = await requireAuth(INBOX_ROLES);
  const isWorker = session.user.role === Role.WORKER;

  const [pending, recentReviews, recentChats] = await Promise.all([
    isWorker
      ? Promise.resolve([])
      : prisma.order.findMany({
          where: { branchId: session.user.branchId, status: 'ON_HOLD' },
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { name: true } },
            serviceType: { select: { name: true, pricePerKg: true } },
            items: { select: { description: true, qty: true, unitPrice: true, total: true } },
          },
        }),
    prisma.orderReview.findMany({
      where: { order: { branchId: session.user.branchId } },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: {
        customer: { select: { name: true } },
        order: {
          select: {
            orderNumber: true,
            serviceType: { select: { name: true } },
          },
        },
      },
    }),
    isWorker
      ? Promise.resolve([])
      : prisma.conversation.findMany({
          where: { organizationId: session.user.organizationId, type: 'CUSTOMER_SUPPORT' },
          orderBy: { lastMessageAt: 'desc' },
          take: 5,
          include: {
            customer: { select: { name: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        }),
  ]);

  return (
    <DashboardShell user={session.user}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
          <Inbox className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-navy">Kotak Masuk</h1>
          <p className="text-brand-navy/60">
            {isWorker
              ? `Ulasan pelanggan · ${session.user.branchName}`
              : `Konfirmasi pesanan, ulasan & chat · ${session.user.branchName}`}
          </p>
        </div>
      </div>

      <div className={`grid gap-6 ${isWorker ? '' : 'lg:grid-cols-[1.4fr_1fr]'}`}>
        {!isWorker && (
          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-brand-navy">
              Pesanan Menunggu Konfirmasi{' '}
              {pending.length > 0 && (
                <span className="ml-1 rounded-full bg-rainbow-pink px-2 py-0.5 text-xs text-white">{pending.length}</span>
              )}
            </h2>
            <PendingOrders
              orders={pending.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                customerName: o.customer?.name ?? 'Pelanggan',
                serviceName: o.serviceType.name,
                itemCount: o.items.reduce((s, it) => s + it.qty, 0),
                total: o.total,
                discount: o.discount,
                weightKg: o.weightKg,
                pricePerKg: o.serviceType.pricePerKg,
                isKiloan: o.items.some((it) => it.description.toLowerCase().includes('kiloan')),
                createdAt: o.createdAt.toISOString(),
                items: o.items.map((it) => ({
                  description: it.description,
                  qty: it.qty,
                  unitPrice: it.unitPrice,
                  total: it.total,
                })),
              }))}
            />
          </section>
        )}

        <div className={`space-y-6 ${isWorker ? 'max-w-2xl' : ''}`}>
          <section id="ulasan">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
              <Star className="h-5 w-5 text-rainbow-yellow" />
              Ulasan Pelanggan
              {recentReviews.length > 0 && (
                <span className="rounded-full bg-rainbow-yellow/20 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {recentReviews.length}
                </span>
              )}
            </h2>
            <InboxReviews
              reviews={recentReviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                note: r.note,
                createdAt: r.createdAt.toISOString(),
                customerName: r.customer.name,
                orderNumber: r.order.orderNumber,
                serviceName: r.order.serviceType.name,
              }))}
            />
          </section>

          {!isWorker && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-brand-navy">Chat Terbaru</h2>
                <Link href="/messages" className="flex items-center gap-1 text-sm text-rainbow-cyan hover:text-rainbow-blue">
                  Semua <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-2">
                {recentChats.length === 0 ? (
                  <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-10 text-center text-brand-navy/40">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm">Belum ada chat</p>
                  </div>
                ) : (
                  recentChats.map((c) => {
                    const name = c.customer?.name ?? 'Pelanggan';
                    const initials = name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    return (
                      <Link
                        key={c.id}
                        href="/messages"
                        className="flex items-center gap-3 rounded-2xl border border-brand-navy/10 bg-white/80 p-3 transition-colors hover:bg-brand-sky/5"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aww-rainbow text-sm font-bold text-white">
                          {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-brand-navy">{name}</p>
                          <p className="truncate text-xs text-brand-navy/50">
                            {c.messages[0]?.body || (c.messages[0]?.attachmentUrl ? '📎 Lampiran' : 'Belum ada pesan')}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
