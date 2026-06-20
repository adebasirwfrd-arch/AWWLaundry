'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from '@/lib/supabase-browser';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string;
  read: boolean;
  createdAt: string;
}

async function fetchNotifications() {
  const res = await fetch('/api/notifications', { cache: 'no-store' });
  if (!res.ok) throw new Error('Gagal memuat notifikasi');
  return res.json() as Promise<{ items: NotificationItem[]; unreadCount: number; userId: string }>;
}

function mapRealtimeNotification(row: Record<string, unknown>): NotificationItem {
  return {
    id: String(row.id),
    type: String(row.type),
    title: String(row.title),
    body: String(row.body),
    data: String(row.data ?? '{}'),
    read: !!row.readAt,
    createdAt:
      typeof row.createdAt === 'string'
        ? row.createdAt
        : row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date().toISOString(),
  };
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const realtimeEnabled = isSupabaseBrowserConfigured();

  const query = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: realtimeEnabled ? false : 30_000,
  });

  useEffect(() => {
    if (!realtimeEnabled) return;

    const userId = query.data?.userId;
    if (!userId) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const incoming = mapRealtimeNotification(payload.new as Record<string, unknown>);
          queryClient.setQueryData<{ items: NotificationItem[]; unreadCount: number; userId: string }>(
            queryKeys.notifications,
            (prev) => {
              if (!prev) return prev;
              if (prev.items.some((n) => n.id === incoming.id)) return prev;
              return {
                ...prev,
                unreadCount: prev.unreadCount + 1,
                items: [incoming, ...prev.items].slice(0, 20),
              };
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          const updated = mapRealtimeNotification(payload.new as Record<string, unknown>);
          queryClient.setQueryData<{ items: NotificationItem[]; unreadCount: number; userId: string }>(
            queryKeys.notifications,
            (prev) => {
              if (!prev) return prev;
              const items = prev.items.map((n) => (n.id === updated.id ? updated : n));
              const unreadCount = items.filter((n) => !n.read).length;
              return { ...prev, items, unreadCount };
            }
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [query.data?.userId, queryClient, realtimeEnabled]);

  return query;
}
