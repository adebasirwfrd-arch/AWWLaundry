import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { MessagesClient } from '@/components/chat/messages-client';
import { MessageSquare } from 'lucide-react';

export default async function MessagesPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER]);

  const conversations = await prisma.conversation.findMany({
    where: { organizationId: session.user.organizationId, type: 'CUSTOMER_SUPPORT' },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-navy">Pesan Pelanggan</h1>
          <p className="text-brand-navy/60">Balas chat dari pelanggan aplikasi</p>
        </div>
      </div>
      <MessagesClient
        conversations={conversations.map((c) => ({
          id: c.id,
          customerName: c.customer?.name ?? c.title ?? 'Pelanggan',
          lastPreview: c.messages[0]?.body || (c.messages[0]?.attachmentUrl ? '📎 Lampiran' : ''),
          lastMessageAt: c.lastMessageAt.toISOString(),
        }))}
      />
    </DashboardShell>
  );
}
