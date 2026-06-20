'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Send, Paperclip, FileText, Loader2 } from 'lucide-react';
import { ROLE_LABELS } from '@aww/shared';
import { useChatMessages, useSendChatMessage, useUploadChatAttachment } from '@/hooks/use-chat-messages';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface Msg {
  id: string;
  senderId: string | null;
  senderName: string;
  senderRole: string;
  body: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  createdAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'bg-brand-orange/15 text-brand-orange',
  MANAGER: 'bg-rainbow-purple/15 text-rainbow-purple',
  CASHIER: 'bg-rainbow-cyan/15 text-rainbow-cyan',
  WORKER: 'bg-rainbow-blue/15 text-rainbow-blue',
  CUSTOMER: 'bg-rainbow-green/15 text-rainbow-green',
};

export function ChatThread({
  conversationId,
  heightClass = 'h-[calc(100dvh-16rem)]',
}: {
  conversationId: string;
  heightClass?: string;
}) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastCountRef = useRef(0);

  const { data, isError } = useChatMessages(conversationId);
  const sendMutation = useSendChatMessage(conversationId);
  const uploadMutation = useUploadChatAttachment(conversationId);

  const messages = (data?.messages ?? []) as Msg[];
  const currentUserId = data?.currentUserId ?? null;
  const sending = sendMutation.isPending;
  const uploading = uploadMutation.isPending;

  useEffect(() => {
    if (isError) toast.error('Gagal memuat pesan');
  }, [isError]);

  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  async function handleSend() {
    const body = text.trim();
    if (!body || sending) return;
    setText('');
    try {
      await sendMutation.mutateAsync(body);
    } catch {
      setText(body);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      await uploadMutation.mutateAsync(fd);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-brand-navy/10 bg-white shadow-aww-sm">
      <div ref={scrollRef} className={cn('space-y-3 overflow-y-auto p-4', heightClass)}>
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-brand-navy/40">
            Belum ada pesan. Mulai percakapan 👋
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[78%]')}>
                  {!mine && (
                    <div className="mb-0.5 flex items-center gap-1.5 px-1">
                      <span className="text-xs font-semibold text-brand-navy">{m.senderName}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold', ROLE_BADGE[m.senderRole] ?? 'bg-brand-navy/10 text-brand-navy')}>
                        {ROLE_LABELS[m.senderRole] ?? m.senderRole}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2.5 text-sm shadow-aww-sm',
                      mine ? 'rounded-br-md bg-aww-rainbow text-white' : 'rounded-bl-md bg-white text-brand-navy'
                    )}
                  >
                    {m.attachmentUrl && m.attachmentType === 'image' && (
                      <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mb-1.5 block">
                        <Image
                          src={m.attachmentUrl}
                          alt={m.attachmentName ?? 'gambar'}
                          width={220}
                          height={220}
                          className="max-h-56 w-auto rounded-xl object-cover"
                        />
                      </a>
                    )}
                    {m.attachmentUrl && m.attachmentType === 'file' && (
                      <a
                        href={m.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={m.attachmentName ?? true}
                        className={cn('mb-1 flex items-center gap-2 rounded-xl px-2 py-1.5', mine ? 'bg-white/20' : 'bg-brand-sky/10')}
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate text-xs underline">{m.attachmentName ?? 'Lampiran'}</span>
                      </a>
                    )}
                    {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    <p className={cn('mt-1 text-right text-[10px]', mine ? 'text-white/70' : 'text-brand-navy/40')}>
                      {new Date(m.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-brand-navy/10 bg-white/90 p-3">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-navy/50 transition-colors hover:bg-brand-navy/5 hover:text-brand-navy disabled:opacity-50"
          aria-label="Lampiran"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Tulis pesan..."
          className="h-11 flex-1 rounded-full border border-brand-navy/10 bg-white px-4 text-sm text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/30"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-aww-rainbow text-white shadow-aww-glow-rainbow transition-transform hover:scale-105 disabled:opacity-40"
          aria-label="Kirim"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
