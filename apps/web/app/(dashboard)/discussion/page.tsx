import { Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { getOrCreateStaffDiscussion, listDiscussionBranches } from '@/app/actions/chat';
import { DiscussionPageClient } from '@/components/discussion/discussion-page-client';
import { MessagesSquare } from 'lucide-react';
import type { DiscussionAudienceScope } from '@/lib/discussion';
import { getAccessibleConversation } from '@/lib/chat';

export default async function DiscussionPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER, Role.WORKER]);
  const params = await searchParams;
  const isOwnerLike =
    session.user.role === Role.OWNER || session.user.role === Role.SUPER_ADMIN;
  const accessUser = {
    id: session.user.id,
    role: String(session.user.role),
    organizationId: session.user.organizationId,
    branchId: session.user.branchId,
  };

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

  let conversationId = await getOrCreateStaffDiscussion({
    branchId: defaultBranchId,
    audienceScope: defaultScope,
  });
  let branchId = defaultBranchId;
  let scope: DiscussionAudienceScope = defaultScope;

  if (params.conversation) {
    const accessible = await getAccessibleConversation(accessUser, params.conversation);
    if (accessible && accessible.type === 'STAFF_DISCUSSION') {
      conversationId = accessible.id;
      branchId = accessible.branchId ?? defaultBranchId;
      scope = (accessible.audienceScope as DiscussionAudienceScope) ?? 'ALL';
    }
  } else {
    const accessible = await getAccessibleConversation(accessUser, conversationId);
    if (!accessible) {
      conversationId = await getOrCreateStaffDiscussion({
        branchId: session.user.branchId,
        audienceScope: defaultScope,
      });
      branchId = session.user.branchId;
    }
  }

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
        initialBranchId={branchId}
        initialScope={scope}
        branches={branches}
        showFilters={isOwnerLike}
        branchLabel={session.user.branchName}
      />
    </DashboardShell>
  );
}
