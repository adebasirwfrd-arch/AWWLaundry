'use client';

import { useState } from 'react';
import { ImageIcon, ZoomIn, X, Wallet } from 'lucide-react';
import {
  formatCurrency,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  CUSTOMER_PAYMENT_MODE_LABELS,
  TRANSFER_BANK_DETAILS,
  type CustomerOrderPaymentInput,
} from '@aww/shared';

interface CustomerPaymentInfoProps {
  paymentStatus: string;
  customerPayment?: CustomerOrderPaymentInput | null;
  payments: Array<{
    method: string;
    amount: number;
    proofUrl?: string | null;
    paidAt?: string;
  }>;
  total: number;
}

export function CustomerPaymentInfo({
  paymentStatus,
  customerPayment,
  payments,
  total,
}: CustomerPaymentInfoProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const paidAmount = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - paidAmount);

  return (
    <>
      <div className="rounded-2xl bg-white p-5 shadow-aww-sm">
        <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-brand-navy/40">
          <Wallet className="h-4 w-4" /> Pembayaran
        </p>

        <div className="mb-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            paymentStatus === 'PAID'
              ? 'bg-rainbow-green/15 text-rainbow-green'
              : paymentStatus === 'PARTIAL'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-amber-100 text-amber-600'
          }`}>
            {PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus}
          </span>
        </div>

        {customerPayment && (
          <p className="mb-3 text-sm text-brand-navy/70">
            Metode: <strong>{CUSTOMER_PAYMENT_MODE_LABELS[customerPayment.mode]}</strong>
          </p>
        )}

        {customerPayment?.mode === 'PAY_LATER' && payments.length === 0 && (
          <div className="rounded-xl bg-rainbow-orange/10 px-4 py-3 text-sm text-brand-navy/75">
            ⏳ Bayar setelah cucian selesai — saat pengambilan di kasir.
          </div>
        )}

        {customerPayment?.mode === 'CASH' && payments.length === 0 && (
          <div className="rounded-xl bg-brand-sky/10 px-4 py-3 text-sm text-brand-navy/75">
            💵 Bayar tunai di kasir saat cucian diterima di cabang.
          </div>
        )}

        {customerPayment?.mode === 'BANK_TRANSFER' && payments.length === 0 && (
          <div className="rounded-xl bg-rainbow-blue/5 px-4 py-3 text-sm">
            <p className="font-semibold text-brand-navy">{TRANSFER_BANK_DETAILS.formatted}</p>
          </div>
        )}

        {payments.length > 0 && (
          <div className="space-y-2">
            {payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-brand-navy/10 px-3 py-2 text-sm">
                <span className="text-brand-navy/75">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                <span className="font-semibold text-brand-orange">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-sm text-amber-700">
                Sisa tagihan: <strong>{formatCurrency(remaining)}</strong>
              </p>
            )}
          </div>
        )}
      </div>

      {payments.some((p) => p.proofUrl) && (
        <div className="rounded-2xl border border-rainbow-cyan/20 bg-brand-sky/5 p-5 shadow-aww-sm">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <ImageIcon className="h-4 w-4 text-rainbow-cyan" /> Bukti Pembayaran
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {payments.filter((p) => p.proofUrl).map((p, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-brand-navy/10 bg-white">
                <div className="flex items-center justify-between border-b border-brand-navy/8 px-3 py-2 text-xs">
                  <span>{PAYMENT_METHOD_LABELS[p.method] ?? p.method} · {formatCurrency(p.amount)}</span>
                  <button type="button" onClick={() => setLightbox(p.proofUrl!)} className="text-brand-navy/50">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.proofUrl!} alt="Bukti pembayaran" className="max-h-48 w-full object-contain" />
              </div>
            ))}
          </div>
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Bukti" className="max-h-[90vh] max-w-full rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
