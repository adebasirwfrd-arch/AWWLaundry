'use client';

import { useEffect, useId } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/lib/toast';
import { sendMessage, uploadAttachment } from '@/app/actions/chat';
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from '@/lib/supabase-browser';

export interface ChatMessage {
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

async function fetchMessages(conversationId: string) {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat pesan');
  return res.json() as Promise<{ messages: ChatMessage[]; currentUserId: string }>;
}

function mapRealtimeMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    senderId: row.senderId ? String(row.senderId) : null,
    senderName: String(row.senderName ?? 'Pengguna'),
    senderRole: String(row.senderRole ?? 'CUSTOMER'),
    body: String(row.body ?? ''),
    attachmentUrl: row.attachmentUrl ? String(row.attachmentUrl) : null,
    attachmentType: row.attachmentType ? String(row.attachmentType) : null,
    attachmentName: row.attachmentName ? String(row.attachmentName) : null,
    createdAt:
      typeof row.createdAt === 'string'
        ? row.createdAt
        : row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date().toISOString(),
  };
}

export function useChatMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const realtimeEnabled = isSupabaseBrowserConfigured();
  const instanceId = useId();

  const query = useQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    // Fallback polling jika Supabase Realtime belum diaktifkan
    refetchInterval: realtimeEnabled ? false : 8_000,
  });

  useEffect(() => {
    if (!conversationId || !realtimeEnabled) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`messages:${conversationId}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = mapRealtimeMessage(payload.new as Record<string, unknown>);
          queryClient.setQueryData<{ messages: ChatMessage[]; currentUserId: string }>(
            queryKeys.chat.messages(conversationId),
            (prev) => {
              if (!prev) return prev;
              if (prev.messages.some((m) => m.id === incoming.id)) return prev;
              return { ...prev, messages: [...prev.messages, incoming] };
            }
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, realtimeEnabled, instanceId]);

  return query;
}

export function useSendChatMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage({ conversationId, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal mengirim pesan'),
  });
}

export function useUploadChatAttachment(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadAttachment(formData),
    onSuccess: async (attachment) => {
      await sendMessage({
        conversationId,
        attachmentUrl: attachment.url,
        attachmentType: attachment.type,
        attachmentName: attachment.name,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal mengunggah lampiran'),
  });
}
