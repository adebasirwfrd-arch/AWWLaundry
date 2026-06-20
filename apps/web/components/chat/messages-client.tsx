'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, ChevronLeft } from 'lucide-react';
import { ChatThread } from '@/components/chat/chat-thread';
import { cn } from '@/lib/utils';

interface ConvoSummary {
  id: string;
  customerName: string;
  lastPreview: string;
  lastMessageAt: string;
}

export function MessagesClient({ conversations }: { conversations: ConvoSummary[] }) {
  const searchParams = useSearchParams();
  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null);
  const active = conversations.find((c) => c.id === activeId);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.some((c) => c.id === conversationId)) {
      setActiveId(conversationId);
    }
  }, [searchParams, conversations]);

  if (conversations.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-18rem)] flex-col items-center justify-center rounded-3xl border border-brand-navy/10 bg-white/70 text-center text-brand-navy/40">
        <MessageSquare className="mb-2 h-10 w-10" />
        <p className="font-medium text-brand-navy/60">Belum ada chat dari pelanggan</p>
        <p className="text-sm">Pesan dari pelanggan akan muncul di sini</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* List */}
      <div className={cn('overflow-hidden rounded-3xl border border-brand-navy/10 bg-white/80 backdrop-blur-md', active && 'hidden lg:block')}>
        <div className="border-b border-brand-navy/10 px-4 py-3">
          <p className="font-display text-sm font-bold text-brand-navy">Percakapan ({conversations.length})</p>
        </div>
        <div className="max-h-[calc(100dvh-22rem)] overflow-y-auto">
          {conversations.map((c) => {
            const initials = c.customerName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-brand-navy/5 px-4 py-3 text-left transition-colors hover:bg-brand-sky/5',
                  activeId === c.id && 'bg-rainbow-cyan/5'
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aww-rainbow text-sm font-bold text-white">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand-navy">{c.customerName}</p>
                  <p className="truncate text-xs text-brand-navy/50">{c.lastPreview || 'Belum ada pesan'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div className={cn(!active && 'hidden lg:block')}>
        {active ? (
          <div>
            <button
              onClick={() => setActiveId(null)}
              className="mb-2 flex items-center gap-1 text-sm font-medium text-brand-navy/60 lg:hidden"
            >
              <ChevronLeft className="h-4 w-4" /> Daftar chat
            </button>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="font-display text-lg font-bold text-brand-navy">{active.customerName}</span>
              <span className="rounded-full bg-rainbow-green/15 px-2 py-0.5 text-[10px] font-bold text-rainbow-green">Pelanggan</span>
            </div>
            <ChatThread key={active.id} conversationId={active.id} heightClass="h-[calc(100dvh-24rem)]" />
          </div>
        ) : (
          <div className="hidden h-full items-center justify-center rounded-3xl border border-brand-navy/10 bg-white/60 text-brand-navy/40 lg:flex">
            Pilih percakapan untuk membalas
          </div>
        )}
      </div>
    </div>
  );
}
