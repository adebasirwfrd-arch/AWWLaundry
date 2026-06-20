'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@aww/shared';
import { getStockOpnameDetail } from '@/app/actions/inventory';
import { OpnameDetailModal, type OpnameDetailData } from '@/components/inventory/opname-detail-modal';
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
  submittedBy?: string | null;
  lineCount: number;
  totalVarianceCost: number;
  lines: { name: string; unit: string; sku?: string | null; systemQty: number; physicalQty: number; variance: number }[];
}

export function InboxOpnameApprovals({
  opnames,
  canApprove,
}: {
  opnames: PendingOpnameItem[];
  canApprove: boolean;
}) {
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<OpnameDetailData | null>(null);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    const opnameId = searchParams.get('opname');
    if (opnameId && opnames.some((o) => o.id === opnameId)) {
      openDetail(opnameId);
    }
  }, [searchParams, opnames]);

  function openDetail(opnameId: string) {
    const cached = opnames.find((o) => o.id === opnameId);
    if (cached) {
      setDetail({
        id: cached.id,
        status: 'PENDING_APPROVAL',
        period: cached.period,
        createdAt: cached.createdAt,
        branchName: cached.branchName,
        branchCode: cached.branchCode,
        submittedBy: cached.submittedBy,
        cashExpected: cached.cashExpected,
        cashActual: cached.cashActual,
        cashVariance: cached.cashVariance,
        notes: cached.notes,
        lineCount: cached.lineCount,
        totalVarianceCost: cached.totalVarianceCost,
        lines: cached.lines.map((l) => ({ ...l, sku: l.sku ?? null })),
      });
      return;
    }

    startTransition(async () => {
      try {
        const d = await getStockOpnameDetail(opnameId);
        setDetail({
          ...d,
          period: new Date(d.period).toISOString(),
          createdAt: new Date(d.createdAt).toISOString(),
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal memuat detail');
      }
    });
  }

  if (opnames.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-10 text-center text-brand-navy/40">
        <ClipboardCheck className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm">Tidak ada stock opname menunggu persetujuan</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {opnames.map((o) => (
          <Card
            key={o.id}
            className="cursor-pointer border-amber-300/60 transition-shadow hover:shadow-aww-md"
            onClick={() => openDetail(o.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-navy">Stock Opname — {o.branchCode}</p>
                  <p className="text-sm text-brand-navy/60">{o.branchName}</p>
                  {o.submittedBy && (
                    <p className="mt-1 text-xs text-brand-navy/50">Diajukan: {o.submittedBy}</p>
                  )}
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
                {o.cashVariance != null && <p>Selisih kas: {formatCurrency(o.cashVariance)}</p>}
              </div>
              <p className="mt-2 text-xs font-medium text-rainbow-cyan">Klik untuk review & approve</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <OpnameDetailModal
        opname={detail}
        onClose={() => setDetail(null)}
        canApprove={canApprove}
        onActionComplete={() => setDetail(null)}
      />

      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-brand-navy/20 text-sm">
          Memuat detail opname...
        </div>
      )}
    </>
  );
}
