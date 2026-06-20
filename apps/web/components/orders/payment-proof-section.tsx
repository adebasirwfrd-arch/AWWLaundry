'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImageIcon, ExternalLink, X, ZoomIn } from 'lucide-react';
import { PAYMENT_METHOD_LABELS } from '@aww/shared';

const PROOF_METHODS = new Set(['QRIS', 'BANK_TRANSFER']);

export function PaymentProofSection({
  payments,
}: {
  payments: Array<{
    method: string;
    amount: number;
    paidAt: string;
    proofUrl?: string | null;
    receivedBy?: string;
  }>;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const proofPayments = payments.filter(
    (p) => PROOF_METHODS.has(p.method) && p.proofUrl
  );

  if (proofPayments.length === 0) return null;

  return (
    <>
      <section className="rounded-3xl border border-rainbow-cyan/25 bg-gradient-to-br from-brand-sky/10 to-white p-5 shadow-aww-sm">
        <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
          <ImageIcon className="h-5 w-5 text-rainbow-cyan" />
          Bukti Transaksi
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {proofPayments.map((p, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white">
              <div className="flex items-center justify-between border-b border-brand-navy/8 px-4 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-brand-navy">
                    {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                  </p>
                  <p className="text-[11px] text-brand-navy/45">
                    {new Date(p.paidAt).toLocaleString('id-ID')}
                    {p.receivedBy && ` · ${p.receivedBy}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setLightbox(p.proofUrl!)}
                    className="rounded-lg p-1.5 text-brand-navy/50 hover:bg-brand-sky/10 hover:text-brand-navy"
                    title="Perbesar"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <Link
                    href={p.proofUrl!}
                    target="_blank"
                    className="rounded-lg p-1.5 text-brand-navy/50 hover:bg-brand-sky/10 hover:text-brand-navy"
                    title="Buka tab baru"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(p.proofUrl!)}
                className="block w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.proofUrl!}
                  alt={`Bukti ${PAYMENT_METHOD_LABELS[p.method] ?? p.method}`}
                  className="max-h-72 w-full object-contain bg-brand-navy/3 transition-opacity hover:opacity-90"
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Bukti transaksi"
            className="max-h-[90vh] max-w-full rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
