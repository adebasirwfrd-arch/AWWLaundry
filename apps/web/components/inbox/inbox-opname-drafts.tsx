'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Play, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cancelStockOpname } from '@/app/actions/inventory';
import { buildOpnameResumeUrl, type OpnameResumeStep } from '@/lib/opname-utils';
import { toast } from '@/lib/toast';

export interface DraftOpnameItem {
  id: string;
  status: string;
  period: string;
  createdAt: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  lineCount: number;
  resumeStep: OpnameResumeStep;
  totalVariance: number;
}

const STEP_LABELS: Record<OpnameResumeStep, string> = {
  count: 'Hitung Fisik',
  cash: 'Rekonsiliasi Kas',
  review: 'Review',
};

export function InboxOpnameDrafts({
  opnames,
  userRole,
}: {
  opnames: DraftOpnameItem[];
  userRole: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleCancel(opnameId: string, branchId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Batalkan stock opname ini? Sesi akan dihapus dan Anda bisa memulai baru.')) return;

    startTransition(async () => {
      try {
        await cancelStockOpname(opnameId, branchId);
        toast.success('Stock opname dibatalkan');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal membatalkan');
      }
    });
  }

  if (opnames.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-8 text-center text-brand-navy/40">
        <ClipboardCheck className="mx-auto mb-2 h-7 w-7" />
        <p className="text-sm">Tidak ada stock opname yang belum selesai</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {opnames.map((o) => {
        const resumeUrl = buildOpnameResumeUrl(userRole, o.branchId, o.resumeStep);
        return (
          <Card
            key={o.id}
            className="border-sky-300/50 transition-shadow hover:shadow-aww-md"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand-navy">Opname Belum Selesai — {o.branchCode}</p>
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
                <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  {STEP_LABELS[o.resumeStep]}
                </span>
              </div>
              <p className="mt-3 text-sm text-brand-navy/70">
                {o.lineCount} item
                {o.totalVariance > 0 ? ` · ${o.totalVariance} baris sudah berbeda dari sistem` : ' · hitungan fisik belum selesai'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={resumeUrl}>
                  <Button size="sm" className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    Lanjutkan Opname
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={pending}
                  onClick={(e) => handleCancel(o.id, o.branchId, e)}
                >
                  <X className="h-3.5 w-3.5" />
                  Batalkan
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
