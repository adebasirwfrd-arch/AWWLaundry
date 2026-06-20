'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, PackageCheck, MessageCircle, Star, Wrench, ClipboardCheck } from 'lucide-react';
import { Role } from '@aww/shared';
import { markNotificationsRead } from '@/app/actions/notifications';
import { useNotifications } from '@/hooks/use-notifications';
import { queryKeys } from '@/lib/query-keys';
import { getNotificationIconKind, getNotificationLink } from '@/lib/notification-links';
import { toast } from '@/lib/toast';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function iconForType(type: string) {
  switch (getNotificationIconKind(type)) {
    case 'review':
      return Star;
    case 'order':
      return PackageCheck;
    case 'message':
      return MessageCircle;
    case 'machine':
      return Wrench;
    case 'opname':
      return ClipboardCheck;
    default:
      return Bell;
  }
}

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export function NotificationBell({ role }: { role: Role }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPosition | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isError, isFetching } = useNotifications();
  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isError) toast.error('Gagal memuat notifikasi');
  }, [isError]);

  const updatePanelPosition = useCallback(() => {
    const anchor = ref.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    const panelWidth = Math.min(320, window.innerWidth - margin * 2);
    const headerHeight = 52;

    let left = rect.right - panelWidth;
    left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;

    let top: number;
    let listMaxHeight: number;

    if (preferBelow) {
      top = rect.bottom + margin;
      listMaxHeight = Math.max(120, Math.min(384, spaceBelow - headerHeight));
    } else {
      listMaxHeight = Math.max(120, Math.min(384, spaceAbove - headerHeight));
      top = Math.max(margin, rect.top - margin - headerHeight - listMaxHeight);
    }

    setPanelPos({
      top,
      left,
      width: panelWidth,
      maxHeight: headerHeight + listMaxHeight,
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    window.addEventListener('orientationchange', updatePanelPosition);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
      window.removeEventListener('orientationchange', updatePanelPosition);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        const panel = document.getElementById('aww-notification-panel');
        if (panel && panel.contains(e.target as Node)) return;
        setOpen(false);
      }
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

  async function openItem(n: (typeof items)[0]) {
    setOpen(false);
    const href = getNotificationLink(n.type, n.data, role);
    if (!href) {
      toast.error('Tujuan notifikasi tidak tersedia');
      return;
    }

    if (!n.read) {
      await markNotificationsRead([n.id]);
      queryClient.setQueryData(queryKeys.notifications, (old: typeof data) => {
        if (!old) return old;
        const items = old.items.map((item) => (item.id === n.id ? { ...item, read: true } : item));
        return { ...old, items, unreadCount: Math.max(0, old.unreadCount - 1) };
      });
    }

    router.push(href);
  }

  const panel =
    open && panelPos ? (
      <div
        id="aww-notification-panel"
        data-notification-panel
        className="fixed z-[10050] flex flex-col overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-aww-lg"
        style={{
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
          maxHeight: panelPos.maxHeight,
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-brand-navy/10 px-4 py-3">
          <p className="font-display text-sm font-bold text-brand-navy">Notifikasi</p>
          {unread > 0 && (
            <button onClick={markAll} className="flex items-center gap-1 text-xs text-rainbow-cyan hover:text-rainbow-blue">
              <CheckCheck className="h-3.5 w-3.5" /> Tandai dibaca
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-brand-navy/40">Belum ada notifikasi</p>
          ) : (
            items.map((n) => {
              const Icon = iconForType(n.type);
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
    ) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) {
              requestAnimationFrame(() => updatePanelPosition());
            }
            return next;
          });
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-brand-navy shadow-aww-sm backdrop-blur-sm transition-colors hover:bg-white"
        aria-label="Notifikasi"
        aria-expanded={open}
      >
        <Bell className={`h-5 w-5 ${isFetching ? 'opacity-70' : ''}`} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rainbow-pink px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
