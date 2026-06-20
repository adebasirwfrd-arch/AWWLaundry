'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, PackageCheck, MessageCircle, Star } from 'lucide-react';
import { markNotificationsRead } from '@/app/actions/notifications';
import { useNotifications } from '@/hooks/use-notifications';
import { queryKeys } from '@/lib/query-keys';
import { toast } from '@/lib/toast';

function linkFor(type: string, data: string): string {
  try {
    const parsed = JSON.parse(data) as { orderId?: string };
    if (parsed.orderId && type === 'ORDER_RECEIVED') {
      return `/orders/${parsed.orderId}`;
    }
  } catch {
    /* ignore */
  }
  if (type === 'ORDER_REVIEW') return '/cashier/inbox#ulasan';
  if (type === 'ORDER_CONFIRMATION') return '/cashier/inbox';
  if (type === 'STOCK_OPNAME_PENDING') return '/cashier/inbox#opname';
  if (type === 'STOCK_OPNAME_APPROVED' || type === 'STOCK_OPNAME_REJECTED') return '/owner/inventory?tab=history';
  if (type === 'CHAT_CUSTOMER') return '/messages';
  if (type === 'CHAT_STAFF') return '/discussion';
  return '#';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isError, isFetching } = useNotifications();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (isError) toast.error('Gagal memuat notifikasi');
  }, [isError]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function markAll() {
    await markNotificationsRead();
    queryClient.setQueryData(queryKeys.notifications, (old: typeof data) =>
      old
        ? { ...old, unreadCount: 0, items: old.items.map((n) => ({ ...n, read: true })) }
        : old
    );
  }

  function openItem(n: (typeof items)[0]) {
    setOpen(false);
    router.push(linkFor(n.type, n.data));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread > 0) markAll();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-brand-navy shadow-aww-sm backdrop-blur-sm transition-colors hover:bg-white"
        aria-label="Notifikasi"
      >
        <Bell className={`h-5 w-5 ${isFetching ? 'opacity-70' : ''}`} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rainbow-pink px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-aww-lg">
          <div className="flex items-center justify-between border-b border-brand-navy/10 px-4 py-3">
            <p className="font-display text-sm font-bold text-brand-navy">Notifikasi</p>
            <button onClick={markAll} className="flex items-center gap-1 text-xs text-rainbow-cyan hover:text-rainbow-blue">
              <CheckCheck className="h-3.5 w-3.5" /> Tandai dibaca
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-brand-navy/40">Belum ada notifikasi</p>
            ) : (
              items.map((n) => {
                const Icon =
                  n.type === 'ORDER_REVIEW'
                    ? Star
                    : n.type === 'ORDER_RECEIVED' || n.type === 'ORDER_CONFIRMATION'
                      ? PackageCheck
                      : MessageCircle;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`flex w-full items-start gap-3 border-b border-brand-navy/5 px-4 py-3 text-left transition-colors hover:bg-brand-sky/5 ${
                      n.read ? '' : 'bg-rainbow-cyan/5'
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aww-rainbow text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-brand-navy">{n.title}</p>
                      <p className="text-xs text-brand-navy/60">{n.body}</p>
                      <p className="mt-0.5 text-[10px] text-brand-navy/35">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rainbow-pink" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
