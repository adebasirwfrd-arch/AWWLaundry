'use client';

import { useTransition } from 'react';
import { Check, X, Pencil, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@aww/shared';
import {
  approveStockOpname,
  rejectStockOpname,
  requestOpnameRevision,
} from '@/app/actions/inventory';
import { toast } from '@/lib/toast';

export interface OpnameDetailData {
  id: string;
  status: string;
  period: string;
  createdAt: string;
  branchName: string;
  branchCode: string;
  submittedBy?: string | null;
  cashExpected: number | null;
  cashActual: number | null;
  cashVariance: number | null;
  notes: string | null;
  lineCount: number;
  totalVarianceCost: number;
  lines: {
    id?: string;
    name: string;
    unit: string;
    sku?: string | null;
    systemQty: number;
    physicalQty: number;
    variance: number;
    varianceCost?: number | null;
  }[];
}

interface OpnameDetailModalProps {
  opname: OpnameDetailData | null;
  onClose: () => void;
  canApprove?: boolean;
  onActionComplete?: () => void;
}

export function OpnameDetailModal({
  opname,
  onClose,
  canApprove = false,
  onActionComplete,
}: OpnameDetailModalProps) {
  const [pending, startTransition] = useTransition();

  if (!opname) return null;

  function done() {
    onActionComplete?.();
    onClose();
    window.location.reload();
  }

  function handleApprove() {
    startTransition(async () => {
      try {
        await approveStockOpname(opname!.id);
        toast.success('Stock opname disetujui');
        done();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal approve');
      }
    });
  }

  function handleReject() {
    const reason = window.prompt('Alasan penolakan (opsional):') ?? undefined;
    startTransition(async () => {
      try {
        await rejectStockOpname(opname!.id, reason || undefined);
        toast.success('Stock opname ditolak');
        done();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal tolak');
      }
    });
  }

  function handleModify() {
    const note = window.prompt('Catatan revisi untuk kasir (wajib):');
    if (!note?.trim()) {
      toast.error('Catatan revisi wajib diisi');
      return;
    }
    startTransition(async () => {
      try {
        await requestOpnameRevision(opname!.id, note.trim());
        toast.success('Opname dikembalikan ke kasir untuk revisi');
        done();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal modify');
      }
    });
  }

  const statusColor =
    opname.status === 'APPROVED'
      ? 'bg-rainbow-green/15 text-rainbow-green'
      : opname.status === 'PENDING_APPROVAL'
        ? 'bg-amber-100 text-amber-700'
        : opname.status === 'REJECTED' || (opname.status === 'CANCELLED' && opname.notes?.includes('Ditolak'))
          ? 'bg-red-100 text-red-600'
          : opname.status === 'CANCELLED'
            ? 'bg-red-100 text-red-600'
            : 'bg-brand-sky/20 text-brand-navy';

  const statusLabel =
    opname.status === 'CANCELLED' && opname.notes?.includes('Ditolak') ? 'REJECTED' : opname.status;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-aww-lg">
        <div className="sticky top-0 border-b border-brand-navy/10 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-brand-orange" />
                <h2 className="font-display text-xl font-bold text-brand-navy">
                  Detail Stock Opname
                </h2>
              </div>
              <p className="mt-1 text-sm text-brand-navy/60">
                {opname.branchCode} — {opname.branchName}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p>
              <span className="text-brand-navy/50">Periode:</span>{' '}
              {new Date(opname.period).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p>
              <span className="text-brand-navy/50">Dibuat:</span>{' '}
              {new Date(opname.createdAt).toLocaleString('id-ID')}
            </p>
            {opname.submittedBy && (
              <p>
                <span className="text-brand-navy/50">Diajukan oleh:</span> {opname.submittedBy}
              </p>
            )}
            <p>
              <span className="text-brand-navy/50">Selisih nilai:</span>{' '}
              <strong>{formatCurrency(opname.totalVarianceCost)}</strong>
            </p>
          </div>

          {opname.cashExpected != null && (
            <div className="rounded-xl bg-brand-sky/5 p-4 text-sm">
              <p>Kas seharusnya: {formatCurrency(opname.cashExpected)}</p>
              <p>Kas aktual: {formatCurrency(opname.cashActual ?? 0)}</p>
              <p>Selisih kas: {formatCurrency(opname.cashVariance ?? 0)}</p>
            </div>
          )}

          {opname.notes && (
            <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <strong>Catatan:</strong> {opname.notes}
            </div>
          )}

          <div>
            <h3 className="mb-2 font-semibold text-brand-navy">Item ({opname.lines.length})</h3>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-brand-navy/10 p-3">
              {opname.lines.map((l, i) => (
                <div key={l.id ?? i} className="flex justify-between text-sm">
                  <span>
                    {l.sku ? `${l.sku} · ` : ''}{l.name}
                  </span>
                  <span className="text-right">
                    {l.systemQty} → {l.physicalQty} {l.unit}{' '}
                    <span
                      className={
                        l.variance !== 0
                          ? l.variance > 0
                            ? 'text-rainbow-green'
                            : 'text-red-500'
                          : 'text-brand-navy/40'
                      }
                    >
                      ({l.variance > 0 ? '+' : ''}{l.variance})
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-brand-navy/10 bg-white px-6 py-4">
          {canApprove && opname.status === 'PENDING_APPROVAL' && (
            <>
              <Button onClick={handleApprove} disabled={pending}>
                <Check className="h-4 w-4" /> Approve & Sesuaikan Stok
              </Button>
              <Button variant="outline" onClick={handleModify} disabled={pending}>
                <Pencil className="h-4 w-4" /> Modify / Revisi
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={pending}>
                <X className="h-4 w-4" /> Reject
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
