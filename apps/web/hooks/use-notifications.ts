'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

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
  return res.json() as Promise<{ items: NotificationItem[]; unreadCount: number }>;
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: fetchNotifications,
    refetchInterval: 20_000,
  });
}
