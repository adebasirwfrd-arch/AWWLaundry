'use client';

import { AlertTriangle } from 'lucide-react';

export type MachineTroubleRow = {
  id: string;
  note: string | null;
  createdAt: string;
  machine: {
    id: string;
    name: string;
    type: string;
    status: string;
    branch: { name: string; code: string };
  };
  reportedBy: { name: string } | null;
};

export function InboxMachineTroubles({ reports }: { reports: MachineTroubleRow[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-10 text-center text-brand-navy/40">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm">Tidak ada laporan gangguan mesin aktif</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <article
          key={r.id}
          className="rounded-2xl border border-red-200 bg-red-50/60 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-navy">{r.machine.name}</p>
              <p className="text-xs text-brand-navy/50">
                {r.machine.type} · {r.machine.branch.name}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Gangguan
            </span>
          </div>
          <p className="mt-2 text-sm text-brand-navy/80">{r.note ?? '—'}</p>
          <p className="mt-2 text-xs text-brand-navy/45">
            Dilaporkan {r.reportedBy?.name ?? 'Staff'} ·{' '}
            {new Date(r.createdAt).toLocaleString('id-ID')}
          </p>
        </article>
      ))}
    </div>
  );
}
