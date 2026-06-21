'use client';

import { useState } from 'react';
import { Wallet, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
import { QrisPaymentDisplay } from '@/components/pos/qris-payment-display';
import { receivePayment } from '@/app/actions/orders';
import { toast } from '@/lib/toast';
import {
  formatCurrency,
  PAYMENT_METHOD_LABELS,
  methodNeedsProof,
  computeRemainingBalance,
  type SplitPaymentMethod,
} from '@aww/shared';

interface RemainingPaymentFormProps {
  orderId: string;
  orderNumber: string;
  total: number;
  paidAmount: number;
  suggestedMethod?: SplitPaymentMethod;
  onPaid?: () => void;
}

export function RemainingPaymentForm({
  orderId,
  orderNumber,
  total,
  paidAmount,
  suggestedMethod,
  onPaid,
}: RemainingPaymentFormProps) {
  const remaining = computeRemainingBalance(total, paidAmount);
  const [method, setMethod] = useState<SplitPaymentMethod>(suggestedMethod ?? 'CASH');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (remaining <= 0) return null;

  const needsProof = methodNeedsProof(method);

  async function handlePay() {
    if (needsProof && !proofUrl) {
      toast.error('Upload bukti pembayaran untuk Transfer/QRIS');
      return;
    }
    setLoading(true);
    try {
      await receivePayment(orderId, method, remaining, proofUrl ?? undefined);
      toast.success('Pelunasan berhasil dicatat');
      onPaid?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mencatat pelunasan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-amber-800">
        <Wallet className="h-4 w-4" />
        Pelunasan Sisa Pembayaran
      </div>

      <div className="mb-3 grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <span className="text-brand-navy/55">Total</span>
          <p className="font-bold text-brand-navy">{formatCurrency(total)}</p>
        </div>
        <div>
          <span className="text-brand-navy/55">Sudah dibayar</span>
          <p className="font-bold text-rainbow-green">{formatCurrency(paidAmount)}</p>
        </div>
        <div>
          <span className="text-brand-navy/55">Sisa</span>
          <p className="font-display text-xl font-bold text-brand-orange">{formatCurrency(remaining)}</p>
        </div>
      </div>

      <Select
        id="remaining-pay-method"
        label="Metode pelunasan"
        value={method}
        onChange={(e) => {
          setMethod(e.target.value as SplitPaymentMethod);
          setProofUrl(null);
          setProofPreview(null);
        }}
        options={[
          { value: 'CASH', label: 'Tunai' },
          { value: 'QRIS', label: 'QRIS' },
          { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
        ]}
      />

      {method === 'QRIS' && (
        <div className="mt-3">
          <QrisPaymentDisplay
            amount={remaining}
            reference={orderNumber}
            label={`QRIS Pelunasan ${orderNumber}`}
          />
          <p className="mt-2 flex items-center gap-1 text-xs text-brand-navy/55">
            <QrCode className="h-3.5 w-3.5" />
            Nominal QR: {formatCurrency(remaining)} — sesuai sisa order {orderNumber}
          </p>
        </div>
      )}

      {needsProof && (
        <div className="mt-3">
          <PaymentProofCapture
            required
            category="payment-proof"
            hint={`Bukti pelunasan ${PAYMENT_METHOD_LABELS[method]}`}
            proofPreview={proofPreview}
            proofUrl={proofUrl}
            onProofChange={(url, preview) => {
              setProofUrl(url);
              setProofPreview(preview);
            }}
          />
        </div>
      )}

      <Button
        className="mt-4 w-full"
        onClick={() => void handlePay()}
        disabled={loading || (needsProof && !proofUrl) || (!!proofPreview && !proofUrl)}
      >
        {loading ? 'Memproses...' : `Catat Pelunasan ${formatCurrency(remaining)}`}
      </Button>
    </div>
  );
}
