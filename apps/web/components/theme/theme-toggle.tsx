'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme/theme-provider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'light' | 'dark';
}

/**
 * Tombol ganti mode terang/gelap.
 * `variant` mengatur warna ikon agar kontras dengan latar di belakangnya
 * (header gelap pakai variant="dark").
 */
export function ThemeToggle({ className, variant = 'light' }: ThemeToggleProps) {
  const { effective, toggle } = useTheme();
  const isDark = effective === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
        variant === 'dark'
          ? 'bg-white/15 text-white hover:bg-white/25'
          : 'bg-brand-navy/5 text-brand-navy hover:bg-brand-navy/10',
        className
      )}
    >
      {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
