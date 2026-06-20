'use client';

import { useState, useTransition } from 'react';
import { ClipboardCheck, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@aww/shared';
import { approveStockOpname, rejectStockOpname } from '@/app/actions/inventory';
import { toast } from '@/lib/toast';

export interface PendingOpnameItem {
  id: string;
  period: string;
  cashExpected: number | null;
  cashActual: number | null;
  cashVariance: number | null;
  notes: string | null;
  createdAt: string;
  branchName: string;
  branchCode: string;
  lineCount: number;
  totalVarianceCost: number;
  lines: { name: string; unit: string; systemQty: number; physicalQty: number; variance: number }[];
}

export function InboxOpnameApprovals({
  opnames,
  canApprove,
}: {
  opnames: PendingOpnameItem[];
  canApprove: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  if (opnames.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-10 text-center text-brand-navy/40">
        <ClipboardCheck className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm">Tidak ada stock opname menunggu persetujuan</p>
      </div>
    );
  }

  function handleApprove(opnameId: string) {
    startTransition(async () => {
      try {
        await approveStockOpname(opnameId);
        toast.success('Stock opname disetujui — stok disesuaikan');
        window.location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal approve');
      }
    });
  }

  function handleReject(opnameId: string) {
    const reason = window.prompt('Alasan penolakan (opsional):') ?? undefined;
    startTransition(async () => {
      try {
        await rejectStockOpname(opnameId, reason || undefined);
        toast.success('Stock opname ditolak');
        window.location.reload();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal tolak');
      }
    });
  }

  return (
    <div className="space-y-3">
      {opnames.map((o) => {
        const expanded = activeId === o.id;
        return (
          <Card key={o.id} className="border-amber-300/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-navy">
                    Stock Opname — {o.branchCode}
                  </p>
                  <p className="text-sm text-brand-navy/60">{o.branchName}</p>
                  <p className="mt-1 text-xs text-brand-navy/45">
                    {new Date(o.period).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Menunggu
                </span>
              </div>

              <div className="mt-3 grid gap-1 text-sm text-brand-navy/70">
                <p>{o.lineCount} item · Selisih nilai {formatCurrency(o.totalVarianceCost)}</p>
                {o.cashVariance != null && (
                  <p>Selisih kas: {formatCurrency(o.cashVariance)}</p>
                )}
              </div>

              <button
                type="button"
                className="mt-2 text-xs font-medium text-rainbow-cyan hover:underline"
                onClick={() => setActiveId(expanded ? null : o.id)}
              >
                {expanded ? 'Sembunyikan detail' : 'Lihat detail item'}
              </button>

              {expanded && (
                <div className="mt-3 space-y-1 rounded-xl bg-brand-sky/5 p-3 text-xs">
                  {o.lines.map((l, i) => (
                    <div key={i} className="flex justify-between">
                      <span>{l.name}</span>
                      <span>
                        {l.systemQty} → {l.physicalQty}{' '}
                        <span className={l.variance !== 0 ? (l.variance > 0 ? 'text-rainbow-green' : 'text-red-500') : ''}>
                          ({l.variance > 0 ? '+' : ''}{l.variance} {l.unit})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {canApprove && (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(o.id)} disabled={pending}>
                    <Check className="h-4 w-4" /> Setujui
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleReject(o.id)} disabled={pending}>
                    <X className="h-4 w-4" /> Tolak
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
