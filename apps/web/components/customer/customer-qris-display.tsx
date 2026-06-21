'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@aww/shared';
import { generateCustomerQrisPayload } from '@/app/actions/qris';

interface CustomerQrisDisplayProps {
  branchId: string;
  amount: number;
  reference?: string;
  label?: string;
}

export function CustomerQrisDisplay({
  branchId,
  amount,
  reference,
  label = 'Scan QRIS — nominal sesuai pesanan',
}: CustomerQrisDisplayProps) {
  const [payload, setPayload] = useState<string | null>(null);
  const [ref, setRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadQris() {
    if (amount <= 0) {
      setPayload(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateCustomerQrisPayload(branchId, amount, reference);
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
  }, [branchId, amount, reference]);

  if (amount <= 0) return null;

  return (
    <div className="rounded-2xl border-2 border-rainbow-purple/30 bg-gradient-to-br from-rainbow-purple/10 via-brand-sky/10 to-rainbow-pink/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <QrCode className="h-4 w-4 text-rainbow-purple" />
          {label}
        </p>
        <button
          type="button"
          onClick={() => void loadQris()}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-brand-navy/60"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <p className="text-center font-display text-2xl font-bold text-brand-orange">{formatCurrency(amount)}</p>
      {error ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{error}</p>
      ) : payload ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-white p-3 shadow-aww-sm">
            <QRCodeSVG value={payload} size={168} level="M" />
          </div>
          {ref && <p className="font-mono text-[10px] text-brand-navy/45">Ref: {ref}</p>}
          <p className="text-center text-xs text-brand-navy/55">Scan dengan e-wallet · upload bukti setelah bayar</p>
        </div>
      ) : null}
    </div>
  );
}
