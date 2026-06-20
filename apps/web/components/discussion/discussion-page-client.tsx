'use client';

import { useState, useTransition } from 'react';
import { Filter, Loader2 } from 'lucide-react';
import { ChatThread } from '@/components/chat/chat-thread';
import {
  getOrCreateStaffDiscussion,
} from '@/app/actions/chat';
import {
  DISCUSSION_SCOPE_LABELS,
  type DiscussionAudienceScope,
} from '@/lib/discussion';

const SCOPES: DiscussionAudienceScope[] = ['ALL', 'ADMIN', 'WORKER'];

export function DiscussionPageClient({
  initialConversationId,
  initialBranchId,
  initialScope,
  branches,
  showFilters,
  branchLabel,
}: {
  initialConversationId: string;
  initialBranchId: string;
  initialScope: DiscussionAudienceScope;
  branches: Array<{ id: string; name: string; code: string }>;
  showFilters: boolean;
  branchLabel: string;
}) {
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [scope, setScope] = useState<DiscussionAudienceScope>(initialScope);
  const [pending, startTransition] = useTransition();

  function applyFilters(nextBranchId: string, nextScope: DiscussionAudienceScope) {
    startTransition(async () => {
      const id = await getOrCreateStaffDiscussion({
        branchId: nextBranchId,
        audienceScope: nextScope,
      });
      setConversationId(id);
      setBranchId(nextBranchId);
      setScope(nextScope);
    });
  }

  const activeBranchName =
    branches.find((b) => b.id === branchId)?.name ?? branchLabel;

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Filter className="h-4 w-4 text-rainbow-cyan" />
            Filter Diskusi
            {pending && <Loader2 className="h-4 w-4 animate-spin text-rainbow-cyan" />}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                Cabang
              </label>
              <select
                value={branchId}
                onChange={(e) => applyFilters(e.target.value, scope)}
                disabled={pending}
                className="h-10 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                Bagian
              </label>
              <select
                value={scope}
                onChange={(e) => applyFilters(branchId, e.target.value as DiscussionAudienceScope)}
                disabled={pending}
                className="h-10 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {DISCUSSION_SCOPE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-brand-navy/50">
            Diskusi aktif: <strong>{activeBranchName}</strong> · {DISCUSSION_SCOPE_LABELS[scope]}
          </p>
        </div>
      )}

      {!showFilters && (
        <p className="text-sm text-brand-navy/55">
          Cabang <strong>{branchLabel}</strong> · {DISCUSSION_SCOPE_LABELS[scope]}
        </p>
      )}

      <ChatThread
        key={conversationId}
        conversationId={conversationId}
        heightClass="h-[calc(100dvh-18rem)]"
      />
    </div>
  );
}
