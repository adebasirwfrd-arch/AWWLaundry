import { Suspense } from 'react';
import Link from 'next/link';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { PendingOrders } from '@/components/pos/pending-orders';
import { InboxReviews } from '@/components/inbox/inbox-reviews';
import { InboxOpnameApprovals } from '@/components/inbox/inbox-opname-approvals';
import { InboxOpnameDrafts } from '@/components/inbox/inbox-opname-drafts';
import { InboxMachineTroubles } from '@/components/inbox/inbox-machine-troubles';
import { listPendingOpnameApprovals, listUnfinishedOpnamesForInbox } from '@/app/actions/inventory';
import { resolveOrderPaymentPlan, parseCustomerPaymentFromNotes } from '@/lib/payment-plan';
import { resolveCustomerPaymentProofs, resolveOrderPaymentProofs } from '@/lib/payment-proof-url';
import { Inbox, MessageSquare, ArrowRight, Star, ClipboardCheck, AlertTriangle } from 'lucide-react';

const INBOX_ROLES = [Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.WORKER];

const machineLogInclude = {
  machine: {
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      branch: { select: { name: true, code: true } },
    },
  },
  reportedBy: { select: { name: true } },
  comments: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { name: true } } },
  },
};

function mapMachineTroubleRow(r: {
  id: string;
  note: string | null;
  createdAt: Date;
  machine: {
    id: string;
    name: string;
    type: string;
    status: string;
    branch: { name: string; code: string };
  };
  reportedBy: { name: string } | null;
  comments: Array<{
    id: string;
    body: string;
    createdAt: Date;
    author: { name: string };
  }>;
}) {
  return {
    id: r.id,
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    machine: r.machine,
    reportedBy: r.reportedBy,
    comments: r.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: c.author,
    })),
  };
}

export default async function CashierInboxPage() {
  const session = await requireAuth(INBOX_ROLES);
  const isWorker = session.user.role === Role.WORKER;
  const isOrgWideInbox =
    session.user.role === Role.OWNER || session.user.role === Role.SUPER_ADMIN;
  const hasInventoryInbox =
    session.user.role === Role.CASHIER ||
    session.user.role === Role.MANAGER ||
    session.user.role === Role.OWNER ||
    session.user.role === Role.SUPER_ADMIN;
  const canApproveOpname = session.user.role === Role.OWNER || session.user.role === Role.SUPER_ADMIN;
  const canSeeMachineTroubles = canApproveOpname;

  const [pending, recentReviews, recentChats, pendingOpnames, draftOpnames, ownerMachineTroubles, workerMachineReports] =
    await Promise.all([
    isWorker
      ? Promise.resolve([])
      : prisma.order.findMany({
          where: isOrgWideInbox
            ? { branch: { organizationId: session.user.organizationId }, status: 'ON_HOLD' }
            : { branchId: session.user.branchId, status: 'ON_HOLD' },
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { name: true } },
            branch: { select: { name: true, code: true } },
            serviceType: { select: { name: true, pricePerKg: true } },
            items: { select: { description: true, qty: true, unitPrice: true, total: true } },
            payments: { select: { method: true, amount: true, proofUrl: true } },
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
    hasInventoryInbox
      ? listPendingOpnameApprovals(canApproveOpname ? undefined : session.user.branchId)
      : Promise.resolve([]),
    hasInventoryInbox ? listUnfinishedOpnamesForInbox() : Promise.resolve([]),
    canSeeMachineTroubles
      ? prisma.machineLog.findMany({
          where: {
            eventType: 'TROUBLE_REPORTED',
            resolvedAt: null,
            machine: {
              status: 'TROUBLE',
              branch: { organizationId: session.user.organizationId },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: machineLogInclude,
        })
      : Promise.resolve([]),
    isWorker
      ? prisma.machineLog.findMany({
          where: {
            eventType: 'TROUBLE_REPORTED',
            reportedById: session.user.id,
            resolvedAt: null,
            machine: { branchId: session.user.branchId },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: machineLogInclude,
        })
      : Promise.resolve([]),
  ]);

  const pendingOrders = await Promise.all(
    pending.map(async (o) => {
      const payments = await resolveOrderPaymentProofs(
        o.payments.map((p) => ({ method: p.method, amount: p.amount, proofUrl: p.proofUrl })),
        o.notes
      );
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        branchName: o.branch.name,
        branchCode: o.branch.code,
        fromApp: o.fromApp,
        customerName: o.customer?.name ?? 'Pelanggan',
        serviceName: o.serviceType.name,
        itemCount: o.items.reduce((s, it) => s + it.qty, 0),
        total: o.total,
        discount: o.discount,
        weightKg: o.weightKg,
        pricePerKg: o.serviceType.pricePerKg,
        isKiloan: o.items.some((it) => it.description.toLowerCase().includes('kiloan')),
        createdAt: o.createdAt.toISOString(),
        notes: o.notes,
        paymentPlan: resolveOrderPaymentPlan(
          o.total,
          o.notes,
          o.payments.map((p) => ({ method: p.method, amount: p.amount }))
        ),
        customerPayment: await resolveCustomerPaymentProofs(parseCustomerPaymentFromNotes(o.notes)),
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          proofUrl: p.proofUrl,
        })),
        items: o.items.map((it) => ({
          description: it.description,
          qty: it.qty,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
      };
    })
  );

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
              ? `Laporan mesin & balasan owner · Ulasan pelanggan · ${session.user.branchName}`
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
            <PendingOrders orders={pendingOrders} showBranch={isOrgWideInbox} />
          </section>
        )}

        <div className={`space-y-6 ${isWorker ? 'max-w-2xl' : ''}`}>
          {isWorker && (
            <section id="laporan-mesin">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Laporan Mesin Saya
                {workerMachineReports.length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {workerMachineReports.length}
                  </span>
                )}
              </h2>
              <InboxMachineTroubles
                reports={workerMachineReports.map(mapMachineTroubleRow)}
                emptyLabel="Belum ada laporan mesin. Laporkan dari Board Produksi jika ada kerusakan."
              />
            </section>
          )}

          {canSeeMachineTroubles && (
            <section id="mesin">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Gangguan Mesin
                {ownerMachineTroubles.length > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {ownerMachineTroubles.length}
                  </span>
                )}
              </h2>
              <InboxMachineTroubles
                reports={ownerMachineTroubles.map(mapMachineTroubleRow)}
                canReply
              />
            </section>
          )}

          {hasInventoryInbox && (
            <section id="opname-draft">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
              <ClipboardCheck className="h-5 w-5 text-sky-500" />
              Stock Opname Belum Selesai
              {draftOpnames.length > 0 && (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                  {draftOpnames.length}
                </span>
              )}
            </h2>
            <InboxOpnameDrafts
              userRole={session.user.role}
              opnames={draftOpnames.map((o) => ({
                id: o.id,
                status: o.status,
                period: o.period.toISOString(),
                createdAt: o.createdAt.toISOString(),
                branchId: o.branchId,
                branchName: o.branchName,
                branchCode: o.branchCode,
                lineCount: o.lineCount,
                resumeStep: o.resumeStep,
                totalVariance: o.totalVariance,
              }))}
            />
          </section>
          )}

          {hasInventoryInbox && (
          <section id="opname">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
              <ClipboardCheck className="h-5 w-5 text-brand-orange" />
              Stock Opname Menunggu Persetujuan
              {pendingOpnames.length > 0 && (
                <span className="rounded-full bg-brand-orange/20 px-2 py-0.5 text-xs font-semibold text-brand-orange">
                  {pendingOpnames.length}
                </span>
              )}
            </h2>
            <Suspense fallback={<p className="text-sm text-brand-navy/50">Memuat opname...</p>}>
              <InboxOpnameApprovals
                canApprove={canApproveOpname}
                opnames={pendingOpnames.map((o) => ({
                  id: o.id,
                  period: o.period.toISOString(),
                  cashExpected: o.cashExpected,
                  cashActual: o.cashActual,
                  cashVariance: o.cashVariance,
                  notes: o.notes,
                  createdAt: o.createdAt.toISOString(),
                  branchName: o.branch.name,
                  branchCode: o.branch.code,
                  submittedBy: o.submittedBy,
                  lineCount: o.lines.length,
                  totalVarianceCost: o.lines.reduce((s, l) => s + Math.abs(l.varianceCost ?? 0), 0),
                  lines: o.lines.map((l) => ({
                    name: l.item.name,
                    unit: l.item.unit,
                    sku: l.item.sku,
                    systemQty: l.systemQty,
                    physicalQty: l.physicalQty,
                    variance: l.variance,
                  })),
                }))}
              />
            </Suspense>
          </section>
          )}

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
