'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  ShoppingCart,
  Wrench,
  LogOut,
  BarChart3,
  Package,
  Users,
  MessageSquare,
  MessagesSquare,
  Inbox,
  Settings2,
  ClipboardList,
  Landmark,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Role, ROLE_LABELS } from '@aww/shared';
import { RainbowBubbleField } from '@/components/animations/rainbow-bubble-field';
import { PageTransition } from '@/components/animations/page-transition';
import { NotificationBell } from '@/components/layout/notification-bell';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/owner', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.OWNER, Role.SUPER_ADMIN] },
  { href: '/owner/orders', label: 'Order', icon: ClipboardList, roles: [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER] },
  { href: '/owner/cashflow', label: 'Cashflow', icon: Landmark, roles: [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER] },
  { href: '/cashier', label: 'POS Kasir', icon: ShoppingCart, roles: [Role.CASHIER, Role.MANAGER, Role.OWNER] },
  { href: '/cashier/cashflow', label: 'Cashflow', icon: Landmark, roles: [Role.CASHIER] },
  { href: '/manager', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.MANAGER] },
  { href: '/worker', label: 'Produksi', icon: Wrench, roles: [Role.WORKER, Role.MANAGER] },
  { href: '/cashier/inbox', label: 'Kotak Masuk', icon: Inbox, roles: [Role.CASHIER, Role.MANAGER, Role.OWNER, Role.WORKER] },
  { href: '/messages', label: 'Pesan', icon: MessageSquare, roles: [Role.OWNER, Role.MANAGER, Role.CASHIER] },
  { href: '/discussion', label: 'Diskusi', icon: MessagesSquare, roles: [Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WORKER] },
  { href: '/owner/analytics', label: 'Analitik', icon: BarChart3, roles: [Role.OWNER, Role.MANAGER] },
  { href: '/owner/inventory', label: 'Stok', icon: Package, roles: [Role.OWNER, Role.MANAGER] },
  { href: '/cashier/inventory', label: 'Stok', icon: Package, roles: [Role.CASHIER] },
  { href: '/owner/customers', label: 'Pelanggan', icon: Users, roles: [Role.OWNER, Role.MANAGER, Role.CASHIER] },
  { href: '/owner/admin-console', label: 'Admin Console', icon: Settings2, roles: [Role.OWNER, Role.SUPER_ADMIN] },
];

function pickBottomNav(items: NavItem[], role: Role): NavItem[] {
  const picked: NavItem[] = [];
  const add = (href: string) => {
    const item = items.find((i) => i.href === href);
    if (item && !picked.some((p) => p.href === item.href)) picked.push(item);
  };

  if (role === Role.CASHIER) {
    add('/cashier');
    add('/cashier/cashflow');
    add('/cashier/inventory');
    add('/cashier/inbox');
    return picked.slice(0, 4);
  }

  add(items[0]?.href ?? '/owner');
  add('/cashier');
  add('/worker');
  add('/cashier/inbox');
  add('/messages');
  add('/discussion');
  return picked.slice(0, 4);
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  className,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav className={cn('space-y-1', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
              active
                ? 'bg-white/20 text-white shadow-aww-sm'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-aww-rainbow" />
            )}
            <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
    branchName: string;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const bottomNav = pickBottomNav(visibleNav, user.role);
  const initials = (user.name ?? 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const sidebarFooter = (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/10 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-aww-rainbow text-sm font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="text-xs text-white/60">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </button>
    </div>
  );

  return (
    <div className="relative flex min-h-dvh bg-aww-brand-hero">
      <RainbowBubbleField density="low" className="opacity-60" />

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col bg-aww-header text-white shadow-aww-lg lg:flex">
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-aww-sm">
            <Image src="/brand/logo.png" alt="AWW Laundry" width={48} height={48} className="h-10 w-10 object-contain" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight">AWW Laundry</h1>
            <p className="text-[10px] font-semibold tracking-widest text-white/60">FRESH • CLEAN • FUN</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavLinks items={visibleNav} pathname={pathname} />
        </div>
        {sidebarFooter}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-brand-navy/40 backdrop-blur-sm lg:hidden"
            aria-label="Tutup menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col bg-aww-header text-white shadow-aww-lg lg:hidden">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <p className="font-display font-bold">Menu</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <NavLinks items={visibleNav} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
            {sidebarFooter}
          </aside>
        </>
      )}

      <div className="relative z-10 flex min-h-dvh flex-1 flex-col lg:ml-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-brand-navy/10 bg-white/80 px-4 py-3 backdrop-blur-md lg:hidden pt-safe">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-navy shadow-aww-sm"
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href={visibleNav[0]?.href ?? '/'} className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="AWW Laundry" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="font-display text-sm font-bold text-brand-navy">AWW Laundry</span>
          </Link>
          <NotificationBell />
        </header>

        <main className="flex-1">
          <div className="hidden items-center justify-end gap-3 px-6 pt-6 lg:flex xl:px-8">
            <NotificationBell />
          </div>
          <div className="px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-4">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-navy/10 bg-white/95 backdrop-blur-md lg:hidden pb-safe">
          <div className="mx-auto flex max-w-lg items-stretch justify-around">
            {bottomNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
                    active ? 'text-brand-pink' : 'text-brand-navy/45'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full',
                      active && 'bg-aww-rainbow text-white shadow-aww-glow-rainbow'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="max-w-[4.5rem] truncate">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-brand-navy/45"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full">
                <Menu className="h-4 w-4" />
              </span>
              Lainnya
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
