'use client';

import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore } from '@/stores/toast-store';
import { cn } from '@/lib/utils';

const STYLES = {
  success: 'border-rainbow-green/30 bg-rainbow-green/10 text-brand-navy',
  error: 'border-red-300 bg-red-50 text-red-800',
  info: 'border-rainbow-cyan/30 bg-rainbow-cyan/10 text-brand-navy',
};

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100vw-2rem,24rem)] flex-col gap-2"
      aria-live="polite"
    >
      {items.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-aww-md backdrop-blur-sm',
              STYLES[t.variant]
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1 font-medium">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-50 hover:opacity-100"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
