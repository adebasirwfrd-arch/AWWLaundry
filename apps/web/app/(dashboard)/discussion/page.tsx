import { Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { getOrCreateStaffDiscussion, listDiscussionBranches } from '@/app/actions/chat';
import { DiscussionPageClient } from '@/components/discussion/discussion-page-client';
import { MessagesSquare } from 'lucide-react';
import type { DiscussionAudienceScope } from '@/lib/discussion';

export default async function DiscussionPage() {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.WORKER]);
  const isOwnerLike = session.user.role === Role.OWNER || session.user.role === Role.SUPER_ADMIN;

  const branches = isOwnerLike
    ? await listDiscussionBranches()
    : [
        {
          id: session.user.branchId,
          name: session.user.branchName,
          code: '',
        },
      ];

  const defaultBranchId = isOwnerLike
    ? (branches[0]?.id ?? session.user.branchId)
    : session.user.branchId;
  const defaultScope: DiscussionAudienceScope = 'ALL';

  const conversationId = await getOrCreateStaffDiscussion({
    branchId: defaultBranchId,
    audienceScope: defaultScope,
  });

  return (
    <DashboardShell user={session.user}>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
          <MessagesSquare className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-navy">Diskusi Tim</h1>
          <p className="text-brand-navy/60">
            {isOwnerLike
              ? 'Pilih cabang & bagian untuk berdiskusi dengan tim terkait'
              : 'Owner, kasir & pekerja berdiskusi dan berbagi lampiran'}
          </p>
        </div>
      </div>
      <DiscussionPageClient
        initialConversationId={conversationId}
        initialBranchId={defaultBranchId}
        initialScope={defaultScope}
        branches={branches}
        showFilters={isOwnerLike}
        branchLabel={session.user.branchName}
      />
    </DashboardShell>
  );
}
