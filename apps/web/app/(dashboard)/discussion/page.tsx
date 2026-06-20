import { Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { getOrCreateStaffDiscussion } from '@/app/actions/chat';
import { ChatThread } from '@/components/chat/chat-thread';
import { MessagesSquare } from 'lucide-react';

export default async function DiscussionPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.WORKER]);
  const conversationId = await getOrCreateStaffDiscussion();

  return (
    <DashboardShell user={session.user}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
          <MessagesSquare className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-navy">Diskusi Tim</h1>
          <p className="text-brand-navy/60">Owner, kasir & pekerja berdiskusi dan berbagi lampiran</p>
        </div>
      </div>
      <ChatThread conversationId={conversationId} heightClass="h-[calc(100dvh-18rem)]" />
    </DashboardShell>
  );
}
