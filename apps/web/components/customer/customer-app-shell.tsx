'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Receipt, Search, User, Sparkles, MessageCircle, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/animations/page-transition';
import { ThemeToggle } from '@/components/theme/theme-toggle';

const NAV = [
  { href: '/customer', label: 'Beranda', icon: Home },
  { href: '/customer/cucianku', label: 'Cucianku', icon: LayoutDashboard },
  { href: '/customer/history', label: 'Riwayat', icon: Receipt },
  { href: '/customer/chat', label: 'Chat', icon: MessageCircle },
  { href: '/track', label: 'Lacak', icon: Search },
  { href: '/customer/profile', label: 'Profil', icon: User },
];

interface Props {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null };
  loyaltyPoints?: number;
}

export function CustomerAppShell({ children, user, loyaltyPoints = 0 }: Props) {
  const pathname = usePathname();
  const firstName = (user.name ?? 'Pelanggan').split(' ')[0];

  return (
    <div className="relative min-h-dvh bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-aww-header text-white shadow-aww-md pt-safe">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 lg:max-w-4xl">
          <Link href="/customer" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-aww-sm">
              <Image src="/brand/logo.png" alt="AWW Laundry" width={40} height={40} className="h-8 w-8 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-xs text-white/70">Halo,</p>
              <p className="font-display text-sm font-bold">{firstName} 👋</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-rainbow-yellow" />
              <span className="text-sm font-bold">{loyaltyPoints}</span>
              <span className="text-xs text-white/70">poin</span>
            </div>
            <ThemeToggle variant="dark" />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-4 lg:max-w-4xl">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-navy/10 bg-white pb-safe">
        <div className="mx-auto flex max-w-2xl items-stretch justify-around lg:max-w-4xl">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || (item.href !== '/customer' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  active ? 'text-brand-pink' : 'text-brand-navy/45 hover:text-brand-navy'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-all',
                    active ? 'bg-aww-rainbow text-white shadow-aww-glow-rainbow' : ''
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
