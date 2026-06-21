'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@aww/shared';
import { generatePosQrisPayload } from '@/app/actions/qris';

interface QrisPaymentDisplayProps {
  amount: number;
  reference?: string;
  label?: string;
  highlight?: boolean;
}

export function QrisPaymentDisplay({
  amount,
  reference,
  label = 'Scan QRIS — jumlah sesuai transaksi',
  highlight = true,
}: QrisPaymentDisplayProps) {
  const [payload, setPayload] = useState<string | null>(null);
  const [ref, setRef] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadQris() {
    if (amount <= 0) {
      setPayload(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generatePosQrisPayload(amount, reference);
      setPayload(result.payload);
      setRef(result.reference);
    } catch (err) {
      setPayload(null);
      setError(err instanceof Error ? err.message : 'Gagal membuat QRIS');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQris();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, reference]);

  if (amount <= 0) return null;

  return (
    <div
      className={`rounded-2xl border-2 p-4 ${
        highlight
          ? 'border-rainbow-purple/40 bg-gradient-to-br from-rainbow-purple/10 to-brand-sky/10'
          : 'border-brand-navy/10 bg-brand-sky/5'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <QrCode className="h-4 w-4 text-rainbow-purple" />
          {label}
        </div>
        <button
          type="button"
          onClick={() => void loadQris()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-brand-navy/60 hover:bg-white/60"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="text-center">
        <p className="font-display text-2xl font-bold text-brand-orange">{formatCurrency(amount)}</p>
        {ref && <p className="mt-1 font-mono text-[10px] text-brand-navy/45">Ref: {ref}</p>}
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{error}</p>
      ) : payload ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white p-3 shadow-aww-sm">
            <QRCodeSVG value={payload} size={160} level="M" />
          </div>
          <p className="text-xs text-brand-navy/55">
            QR dinamis — nominal otomatis menyesuaikan jumlah transaksi
          </p>
        </div>
      ) : loading ? (
        <p className="mt-3 text-center text-xs text-brand-navy/50">Membuat QRIS...</p>
      ) : null}
    </div>
  );
}
