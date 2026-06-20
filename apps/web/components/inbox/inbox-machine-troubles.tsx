'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { replyMachineTrouble } from '@/app/actions/machine-trouble';
import { toast } from '@/lib/toast';

export type MachineTroubleComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { name: string };
};

export type MachineTroubleRow = {
  id: string;
  note: string | null;
  createdAt: string;
  machine: {
    id: string;
    name: string;
    type: string;
    status: string;
    branch: { name: string; code: string };
  };
  reportedBy: { name: string } | null;
  comments: MachineTroubleComment[];
};

export function InboxMachineTroubles({
  reports,
  canReply = false,
  emptyLabel = 'Tidak ada laporan gangguan mesin aktif',
}: {
  reports: MachineTroubleRow[];
  canReply?: boolean;
  emptyLabel?: string;
}) {
  const [items, setItems] = useState(reports);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function submitReply(machineLogId: string) {
    const body = (drafts[machineLogId] ?? '').trim();
    if (!body) {
      toast.error('Komentar wajib diisi');
      return;
    }
    startTransition(async () => {
      try {
        await replyMachineTrouble(machineLogId, body);
        setItems((prev) =>
          prev.map((r) =>
            r.id === machineLogId
              ? {
                  ...r,
                  comments: [
                    ...r.comments,
                    {
                      id: `local-${Date.now()}`,
                      body,
                      createdAt: new Date().toISOString(),
                      author: { name: 'Owner' },
                    },
                  ],
                }
              : r
          )
        );
        setDrafts((prev) => ({ ...prev, [machineLogId]: '' }));
        toast.success('Balasan terkirim ke pekerja');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal mengirim balasan');
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-10 text-center text-brand-navy/40">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-red-200 bg-red-50/60 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-navy">{r.machine.name}</p>
              <p className="text-xs text-brand-navy/50">
                {r.machine.type} · {r.machine.branch.name}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Gangguan
            </span>
          </div>
          <p className="mt-2 text-sm text-brand-navy/80">{r.note ?? '—'}</p>
          <p className="mt-2 text-xs text-brand-navy/45">
            Dilaporkan {r.reportedBy?.name ?? 'Staff'} ·{' '}
            {new Date(r.createdAt).toLocaleString('id-ID')}
          </p>

          {r.comments.length > 0 && (
            <div className="mt-3 space-y-2 rounded-xl border border-brand-navy/10 bg-white/80 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
                <MessageSquare className="h-3.5 w-3.5" />
                {canReply ? 'Riwayat balasan' : 'Balasan Owner'}
              </p>
              {r.comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-sky-50 px-3 py-2 text-sm">
                  <p className="font-medium text-brand-navy">{c.author.name}</p>
                  <p className="text-brand-navy/80">{c.body}</p>
                  <p className="mt-1 text-[11px] text-brand-navy/40">
                    {new Date(c.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          )}

          {canReply && (
            <div className="mt-3 flex gap-2">
              <input
                value={drafts[r.id] ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submitReply(r.id)}
                placeholder="Tulis instruksi atau komentar untuk pekerja..."
                className="h-10 min-w-0 flex-1 rounded-xl border border-brand-navy/15 px-3 text-sm"
                disabled={pending}
              />
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => submitReply(r.id)}
                disabled={pending || !(drafts[r.id] ?? '').trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
