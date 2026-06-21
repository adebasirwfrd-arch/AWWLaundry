'use client';

import { useMemo } from 'react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
import { QrisPaymentDisplay } from '@/components/pos/qris-payment-display';
import { CopyableAccountNumber } from '@/components/payment/copyable-account-number';
import {
  formatCurrency,
  methodNeedsProof,
  computeCombinationPayment,
  type SplitPaymentMethod,
  type RemainingTiming,
  TRANSFER_BANK_DETAILS,
  type TransferBankDetails,
} from '@aww/shared';

const METHOD_OPTIONS = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
];

const TIMING_OPTIONS = [
  { value: 'NOW', label: 'Bayar sekarang' },
  { value: 'LATER', label: 'Bayar setelah selesai' },
];

export interface CombinationFormState {
  dpMethod: SplitPaymentMethod;
  dpAmount: string;
  remainingMethod: SplitPaymentMethod;
  remainingTiming: RemainingTiming;
}

interface CombinationPaymentFormProps {
  total: number;
  state: CombinationFormState;
  onChange: (patch: Partial<CombinationFormState>) => void;
  dpProofUrl: string | null;
  dpProofPreview: string | null;
  onDpProofChange: (url: string | null, preview: string | null) => void;
  remainingProofUrl: string | null;
  remainingProofPreview: string | null;
  onRemainingProofChange: (url: string | null, preview: string | null) => void;
  /** Untuk QRIS di flow pelanggan (checkout app). */
  branchId?: string;
  /** Rekening transfer cabang — fallback ke default sistem jika tidak diisi. */
  bankDetails?: TransferBankDetails;
}

export function CombinationPaymentForm({
  total,
  state,
  onChange,
  dpProofUrl,
  dpProofPreview,
  onDpProofChange,
  remainingProofUrl,
  remainingProofPreview,
  onRemainingProofChange,
  branchId,
  bankDetails,
}: CombinationPaymentFormProps) {
  const dpNum = parseFloat(state.dpAmount) || 0;
  const remaining = Math.max(0, Math.round(total - dpNum));
  const dpNeedsProof = methodNeedsProof(state.dpMethod);
  const remainingNeedsProof =
    state.remainingTiming === 'NOW' && methodNeedsProof(state.remainingMethod);

  const validationHint = useMemo(() => {
    if (dpNum <= 0) return 'Masukkan jumlah DP awal';
    if (dpNum >= total) return 'DP harus kurang dari total';
    if (state.remainingTiming === 'NOW' && remaining <= 0) return null;
    return null;
  }, [dpNum, total, state.remainingTiming, remaining]);

  return (
    <div className="space-y-4 rounded-2xl border border-brand-navy/10 bg-brand-sky/5 p-4">
      <p className="text-sm font-semibold text-brand-navy">Pembayaran Kombinasi (DP)</p>

      <Select
        id="dp-method"
        label="Metode DP Awal"
        value={state.dpMethod}
        onChange={(e) => {
          onChange({ dpMethod: e.target.value as SplitPaymentMethod });
          onDpProofChange(null, null);
        }}
        options={METHOD_OPTIONS}
      />

      <Input
        id="dp-amount"
        label="Jumlah DP Awal"
        type="number"
        min="1"
        step="1000"
        value={state.dpAmount}
        onChange={(e) => onChange({ dpAmount: e.target.value })}
        placeholder="Contoh: 20000"
      />

      {validationHint && (
        <p className="text-xs text-amber-600">{validationHint}</p>
      )}

      {state.dpMethod === 'BANK_TRANSFER' && (
        <TransferBankInfo amount={dpNum > 0 ? dpNum : 0} bankDetails={bankDetails} />
      )}

      {state.dpMethod === 'QRIS' && dpNum > 0 && (
        <QrisPaymentDisplay amount={dpNum} branchId={branchId} label="QRIS DP Awal — scan dengan nominal DP" />
      )}

      {state.dpMethod === 'QRIS' && dpNum <= 0 && (
        <p className="rounded-xl bg-rainbow-purple/10 px-3 py-2 text-xs text-brand-navy/70">
          Masukkan jumlah DP awal — QRIS akan menampilkan nominal sesuai jumlah yang diinput.
        </p>
      )}

      {dpNeedsProof && dpNum > 0 && (
        <PaymentProofCapture
          required
          category="payment-proof"
          hint="Foto bukti pembayaran DP awal"
          proofPreview={dpProofPreview}
          proofUrl={dpProofUrl}
          onProofChange={(url, preview) => onDpProofChange(url, preview)}
        />
      )}

      {dpNum > 0 && dpNum < total && (
        <div className="rounded-xl bg-white/70 px-3 py-2 text-sm">
          <span className="text-brand-navy/60">Sisa pembayaran: </span>
          <span className="font-bold text-brand-orange">{formatCurrency(remaining)}</span>
        </div>
      )}

      {dpNum > 0 && dpNum < total && (
        <>
          <Select
            id="remaining-method"
            label="Sisa dibayar via"
            value={state.remainingMethod}
            onChange={(e) => {
              onChange({ remainingMethod: e.target.value as SplitPaymentMethod });
              onRemainingProofChange(null, null);
            }}
            options={METHOD_OPTIONS}
          />

          <Select
            id="remaining-timing"
            label="Kapan sisa dibayar?"
            value={state.remainingTiming}
            onChange={(e) => {
              onChange({ remainingTiming: e.target.value as RemainingTiming });
              onRemainingProofChange(null, null);
            }}
            options={TIMING_OPTIONS}
          />

          {state.remainingTiming === 'LATER' && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Sisa {formatCurrency(remaining)} akan ditagih saat cucian selesai via{' '}
              {METHOD_OPTIONS.find((m) => m.value === state.remainingMethod)?.label}.
              {state.remainingMethod === 'QRIS' &&
                ' QRIS akan menampilkan nominal sisa saat pelunasan.'}
            </p>
          )}

          {state.remainingMethod === 'BANK_TRANSFER' && (
            <TransferBankInfo amount={remaining} bankDetails={bankDetails} />
          )}

          {state.remainingMethod === 'QRIS' && state.remainingTiming === 'NOW' && remaining > 0 && (
            <QrisPaymentDisplay
              amount={remaining}
              branchId={branchId}
              label="QRIS Pelunasan — scan dengan nominal sisa"
            />
          )}

          {remainingNeedsProof && (
            <PaymentProofCapture
              required
              category="payment-proof"
              hint="Foto bukti pelunasan sisa"
              proofPreview={remainingProofPreview}
              proofUrl={remainingProofUrl}
              onProofChange={(url, preview) => onRemainingProofChange(url, preview)}
            />
          )}
        </>
      )}
    </div>
  );
}

export function TransferBankInfo({
  amount,
  bankDetails = TRANSFER_BANK_DETAILS,
}: {
  amount: number;
  bankDetails?: TransferBankDetails;
}) {
  return (
    <div className="rounded-xl border border-rainbow-blue/20 bg-rainbow-blue/5 p-3 text-sm">
      <p className="font-semibold text-brand-navy">Transfer ke {bankDetails.bankName}</p>
      <p className="mt-1 text-brand-navy/70">a.n. {bankDetails.accountName}</p>
      <CopyableAccountNumber
        value={bankDetails.accountNumber}
        showHint
        className="mt-1"
      />
      {amount > 0 ? (
        <p className="mt-1 text-xs text-brand-navy/55">Nominal: {formatCurrency(amount)}</p>
      ) : (
        <p className="mt-1 text-xs text-brand-navy/55">Nominal mengikuti jumlah transaksi / DP</p>
      )}
    </div>
  );
}
