'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from '@/lib/toast';

interface CopyableAccountNumberProps {
  value: string;
  className?: string;
  /** Tampilkan label "No. Rekening" di atas angka. */
  showLabel?: boolean;
  /** Tampilkan petunjuk "Klik untuk salin". */
  showHint?: boolean;
}

export function CopyableAccountNumber({
  value,
  className = '',
  showLabel = false,
  showHint = true,
}: CopyableAccountNumberProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success('No. rekening disalin');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin no. rekening');
    }
  }

  return (
    <div className={className}>
      {showLabel && <span className="text-brand-navy/50">No. Rekening</span>}
      <button
        type="button"
        onClick={copy}
        className="group mt-0.5 flex w-full items-center gap-2 rounded-lg text-left transition-colors hover:bg-brand-sky/10 active:scale-[0.99]"
        title="Salin no. rekening"
        aria-label="Salin no. rekening"
      >
        <strong className="font-mono text-lg tracking-wide text-brand-orange">{value}</strong>
        {copied ? (
          <Check className="h-4 w-4 shrink-0 text-rainbow-green" aria-hidden />
        ) : (
          <Copy className="h-4 w-4 shrink-0 text-brand-navy/40 group-hover:text-rainbow-cyan" aria-hidden />
        )}
      </button>
      {showHint && (
        <p className="mt-1 text-[11px] text-brand-navy/45">Klik nomor rekening untuk salin</p>
      )}
    </div>
  );
}
