'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/lib/toast';
import { sendMessage, uploadAttachment } from '@/app/actions/chat';

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

export function useChatMessages(conversationId: string) {
  return useQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: () => fetchMessages(conversationId),
    refetchInterval: 4_000,
    enabled: !!conversationId,
  });
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
