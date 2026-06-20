'use client';

import { ORDER_STATUS_LABELS } from '@aww/shared';
import { semantic } from '@aww/design-tokens';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: semantic.light.order.received,
  WASHING: semantic.light.order.washing,
  DRYING: semantic.light.order.drying,
  IRONING: semantic.light.order.ironing,
  FOLDING: semantic.light.order.folding,
  READY: semantic.light.order.ready,
  PICKED_UP: semantic.light.order.pickedUp,
  ON_HOLD: semantic.light.order.trouble,
  CANCELLED: '#9CA3AF',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? '#6B7280';
  const label = ORDER_STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white',
        className
      )}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
