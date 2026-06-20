'use client';

import { useCallback } from 'react';
import { Scale, Unplug, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useScale } from '@/hooks/use-scale';
import { usePosDraftStore } from '@/stores/pos-draft-store';
import { formatWeight } from '@aww/shared';

export function ScalePanel() {
  const setField = usePosDraftStore((s) => s.setField);
  const weight = usePosDraftStore((s) => s.weight);

  const onStable = useCallback(
    (kg: number) => setField('weight', kg.toFixed(2)),
    [setField]
  );

  const { reading, state, supported, connect, disconnect } = useScale(onStable);

  const statusColor =
    state === 'connected'
      ? 'text-rainbow-green'
      : state === 'connecting'
        ? 'text-amber-500'
        : state === 'error'
          ? 'text-red-500'
          : 'text-brand-navy/40';

  return (
    <div className="rounded-xl border border-brand-navy/10 bg-brand-sky/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Scale className={`h-5 w-5 ${statusColor}`} />
          <div>
            <p className="text-sm font-semibold text-brand-navy">Timbangan Digital</p>
            <p className={`text-xs ${statusColor}`}>
              {state === 'connected'
                ? reading?.stable
                  ? 'Berat stabil'
                  : 'Menunggu stabil...'
                : state === 'connecting'
                  ? 'Menghubungkan...'
                  : state === 'error'
                    ? 'Gagal terhubung'
                    : supported
                      ? 'Belum terhubung'
                      : 'Gunakan Chrome/Edge desktop'}
            </p>
          </div>
        </div>

        {state === 'connected' ? (
          <div className="flex items-center gap-2">
            {reading && (
              <span className="font-mono text-lg font-bold text-brand-orange">
                {formatWeight(reading.weightKg)}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => disconnect()}>
              <Unplug className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={!supported || state === 'connecting'}
            onClick={() => connect().catch(() => {})}
          >
            {supported ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            Hubungkan USB
          </Button>
        )}
      </div>

      {state === 'connected' && reading?.stable && (
        <Button
          variant="primary"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setField('weight', reading.weightKg.toFixed(2))}
        >
          Ambil Berat {formatWeight(reading.weightKg)}
        </Button>
      )}

      {weight && state !== 'connected' && (
        <p className="mt-2 text-xs text-brand-navy/50">Input manual: {formatWeight(parseFloat(weight) || 0)}</p>
      )}
    </div>
  );
}
