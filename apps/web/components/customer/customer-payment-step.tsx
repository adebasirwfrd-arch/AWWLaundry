'use client';

import { useMemo, useState } from 'react';
import {
  Wallet,
  QrCode,
  Building2,
  Sparkles,
  PartyPopper,
  Coins,
  CreditCard,
  ArrowLeft,
  Clock,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
import {
  CombinationPaymentForm,
  type CombinationFormState,
} from '@/components/pos/combination-payment-form';
import { CustomerQrisDisplay } from '@/components/customer/customer-qris-display';
import {
  formatCurrency,
  TRANSFER_BANK_DETAILS,
  CUSTOMER_PAYMENT_MODE_LABELS,
  methodNeedsProof,
  type CustomerPaymentMode,
  type CustomerOrderPaymentInput,
  type SplitPaymentMethod,
  type RemainingTiming,
} from '@aww/shared';

const MODE_OPTIONS: { value: CustomerPaymentMode; label: string; emoji: string }[] = [
  { value: 'CASH', label: 'Tunai', emoji: '💵' },
  { value: 'QRIS', label: 'QRIS', emoji: '📱' },
  { value: 'BANK_TRANSFER', label: 'Transfer', emoji: '🏦' },
  { value: 'COMBINATION', label: 'Kombinasi DP', emoji: '✨' },
  { value: 'PAY_LATER', label: 'Bayar Nanti', emoji: '⏳' },
];

const defaultCombination: CombinationFormState = {
  dpMethod: 'CASH',
  dpAmount: '',
  remainingMethod: 'QRIS',
  remainingTiming: 'LATER',
};

export interface CustomerPaymentStepResult extends CustomerOrderPaymentInput {}

interface CustomerPaymentStepProps {
  totalPrice: number;
  branchId: string;
  branchName: string;
  summaryLabel: string;
  loading: boolean;
  onBack: () => void;
  onSubmit: (payment: CustomerPaymentStepResult) => void;
}

function rupiah(n: number) {
  return formatCurrency(n);
}

export function CustomerPaymentStep({
  totalPrice,
  branchId,
  branchName,
  summaryLabel,
  loading,
  onBack,
  onSubmit,
}: CustomerPaymentStepProps) {
  const [mode, setMode] = useState<CustomerPaymentMode>('CASH');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [combination, setCombination] = useState<CombinationFormState>(defaultCombination);
  const [dpProofUrl, setDpProofUrl] = useState<string | null>(null);
  const [dpProofPreview, setDpProofPreview] = useState<string | null>(null);
  const [remainingProofUrl, setRemainingProofUrl] = useState<string | null>(null);
  const [remainingProofPreview, setRemainingProofPreview] = useState<string | null>(null);

  const dpNum = parseFloat(combination.dpAmount) || 0;

  const validationError = useMemo(() => {
    if (totalPrice <= 0) return 'Total pesanan tidak valid';

    if (mode === 'QRIS' || mode === 'BANK_TRANSFER') {
      if (!proofUrl) return 'Upload bukti pembayaran wajib';
      if (proofPreview && !proofUrl) return 'Tunggu upload bukti selesai';
    }

    if (mode === 'COMBINATION') {
      if (dpNum <= 0) return 'Masukkan jumlah DP awal';
      if (dpNum >= totalPrice) return 'DP harus kurang dari total';
      if (methodNeedsProof(combination.dpMethod) && !dpProofUrl) {
        return 'Upload bukti pembayaran DP awal';
      }
      if (combination.remainingTiming === 'NOW' && methodNeedsProof(combination.remainingMethod)) {
        if (!remainingProofUrl) return 'Upload bukti pelunasan';
      }
    }
    return null;
  }, [
    mode,
    totalPrice,
    proofUrl,
    proofPreview,
    dpNum,
    combination,
    dpProofUrl,
    remainingProofUrl,
  ]);

  function selectMode(next: CustomerPaymentMode) {
    setMode(next);
    setProofUrl(null);
    setProofPreview(null);
    setDpProofUrl(null);
    setDpProofPreview(null);
    setRemainingProofUrl(null);
    setRemainingProofPreview(null);
    if (next === 'COMBINATION' && !combination.dpAmount && totalPrice > 0) {
      setCombination((s) => ({ ...s, dpAmount: String(Math.round(totalPrice * 0.4)) }));
    }
  }

  function handleSubmit() {
    if (validationError) {
      alert(validationError);
      return;
    }

    if (mode === 'COMBINATION') {
      onSubmit({
        mode: 'COMBINATION',
        combination: {
          dpMethod: combination.dpMethod as SplitPaymentMethod,
          dpAmount: dpNum,
          dpProofUrl: methodNeedsProof(combination.dpMethod) ? dpProofUrl ?? undefined : undefined,
          remainingMethod: combination.remainingMethod as SplitPaymentMethod,
          remainingTiming: combination.remainingTiming as RemainingTiming,
          remainingProofUrl:
            combination.remainingTiming === 'NOW' && methodNeedsProof(combination.remainingMethod)
              ? remainingProofUrl ?? undefined
              : undefined,
        },
      });
      return;
    }

    onSubmit({
      mode,
      proofUrl: methodNeedsProof(mode) ? proofUrl ?? undefined : undefined,
    });
  }

  return (
    <div className="space-y-5 pb-28">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-navy/60 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke pesanan
      </button>

      <div>
        <h2 className="font-display text-xl font-bold text-brand-navy">Metode Pembayaran</h2>
        <p className="mt-1 text-sm text-brand-navy/55">
          {summaryLabel} · Estimasi <strong className="text-brand-orange">{rupiah(totalPrice)}</strong>
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-rainbow-cyan/25 bg-brand-sky/10 px-4 py-3 text-sm text-brand-navy/75">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rainbow-cyan" />
        <p>
          Cabang: <strong className="text-brand-navy">{branchName}</strong> — konfirmasi kasir di cabang ini setelah pesanan terkirim.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectMode(opt.value)}
            className={`rounded-2xl border-2 px-2 py-3 text-center transition-all ${
              mode === opt.value
                ? 'border-rainbow-cyan bg-rainbow-cyan/10 shadow-aww-sm'
                : 'border-brand-navy/10 bg-white hover:border-rainbow-cyan/40'
            }`}
          >
            <span className="text-xl">{opt.emoji}</span>
            <p className="mt-1 text-xs font-semibold text-brand-navy">{opt.label}</p>
          </button>
        ))}
      </div>

      {mode === 'CASH' && (
        <div className="rounded-3xl border border-brand-navy/10 bg-gradient-to-br from-brand-sky/15 to-white p-6 text-center shadow-aww-sm">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-brand-sky/20 text-3xl">
            💵
          </div>
          <h3 className="font-display text-lg font-bold text-brand-navy">Bayar di Kasir</h3>
          <p className="mt-2 text-sm text-brand-navy/65">
            Tunjukkan pesanan ini saat sampai di cabang. Pembayaran tunai dilakukan langsung ke kasir setelah cucian ditimbang ulang.
          </p>
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Estimasi tagihan: {rupiah(totalPrice)} — final mengikuti berat timbang di kasir
          </p>
        </div>
      )}

      {mode === 'QRIS' && (
        <div className="space-y-4">
          <CustomerQrisDisplay branchId={branchId} amount={totalPrice} label="Scan QRIS — bayar sesuai nominal" />
          <PaymentProofCapture
            required
            category="payment-proof"
            title="Upload Bukti QRIS"
            hint="Screenshot bukti bayar QRIS dari e-wallet kamu"
            proofPreview={proofPreview}
            proofUrl={proofUrl}
            onProofChange={(url, preview) => {
              setProofUrl(url);
              setProofPreview(preview);
            }}
          />
        </div>
      )}

      {mode === 'BANK_TRANSFER' && (
        <div className="space-y-4">
          <div className="rounded-3xl border-2 border-rainbow-blue/25 bg-gradient-to-br from-rainbow-blue/10 to-white p-5 shadow-aww-sm">
            <div className="flex items-center gap-2 font-semibold text-brand-navy">
              <Building2 className="h-5 w-5 text-rainbow-blue" />
              Transfer ke Rekening Owner
            </div>
            <div className="mt-4 space-y-2 rounded-2xl bg-white/80 p-4 text-sm">
              <p><span className="text-brand-navy/50">Bank</span><br /><strong>{TRANSFER_BANK_DETAILS.bankName}</strong></p>
              <p><span className="text-brand-navy/50">Atas Nama</span><br /><strong>{TRANSFER_BANK_DETAILS.accountName}</strong></p>
              <p><span className="text-brand-navy/50">No. Rekening</span><br />
                <strong className="font-mono text-lg tracking-wide text-brand-orange">{TRANSFER_BANK_DETAILS.accountNumber}</strong>
              </p>
              <p><span className="text-brand-navy/50">Nominal transfer</span><br />
                <strong className="text-brand-orange">{rupiah(totalPrice)}</strong>
              </p>
            </div>
          </div>
          <PaymentProofCapture
            required
            category="payment-proof"
            title="Upload Bukti Transfer"
            hint="Foto/screenshot bukti transfer bank"
            proofPreview={proofPreview}
            proofUrl={proofUrl}
            onProofChange={(url, preview) => {
              setProofUrl(url);
              setProofPreview(preview);
            }}
          />
        </div>
      )}

      {mode === 'PAY_LATER' && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-3xl border-2 border-rainbow-orange/30 bg-gradient-to-br from-rainbow-orange/15 via-rainbow-yellow/10 to-white p-5 shadow-aww-md">
            <div className="absolute -right-3 -top-3 text-5xl opacity-20">⏳</div>
            <div className="relative flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-aww-sm">
                <Clock className="h-7 w-7 text-rainbow-orange" />
              </div>
              <div>
                <p className="font-display text-lg font-extrabold text-brand-navy">
                  Bayar jika sudah selesai ✨
                </p>
                <p className="mt-1 text-sm text-brand-navy/70">
                  Tidak perlu bayar sekarang. Kasir akan konfirmasi pesanan saat cucian diterima di cabang.
                  Pembayaran dilakukan setelah cucian selesai — saat pengambilan.
                </p>
              </div>
            </div>
          </div>
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Estimasi tagihan: {rupiah(totalPrice)} — final mengikuti berat timbang di kasir
          </p>
        </div>
      )}

      {mode === 'COMBINATION' && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border-2 border-rainbow-pink/30 bg-gradient-to-br from-rainbow-pink/15 via-rainbow-purple/10 to-rainbow-yellow/15 p-5 shadow-aww-md">
            <div className="absolute -right-4 -top-4 text-6xl opacity-20">🎉</div>
            <div className="relative flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-2xl shadow-aww-sm">
                <PartyPopper className="h-7 w-7 text-rainbow-pink" />
              </div>
              <div>
                <p className="font-display text-lg font-extrabold text-brand-navy">
                  Kamu bisa bayar DP dulu loh!! 🙌
                </p>
                <p className="mt-1 text-sm text-brand-navy/70">
                  <Sparkles className="mr-1 inline h-4 w-4 text-rainbow-yellow" />
                  Sisanya dibayar setelah cucian selesai — fleksibel via tunai, QRIS, atau transfer!
                  <Coins className="ml-1 inline h-4 w-4 text-rainbow-orange" />
                  <CreditCard className="ml-1 inline h-4 w-4 text-rainbow-purple" />
                </p>
              </div>
            </div>
          </div>

          <CombinationPaymentForm
            total={totalPrice}
            branchId={branchId}
            state={combination}
            onChange={(patch) => setCombination((s) => ({ ...s, ...patch }))}
            dpProofUrl={dpProofUrl}
            dpProofPreview={dpProofPreview}
            onDpProofChange={(url, preview) => {
              setDpProofUrl(url);
              setDpProofPreview(preview);
            }}
            remainingProofUrl={remainingProofUrl}
            remainingProofPreview={remainingProofPreview}
            onRemainingProofChange={(url, preview) => {
              setRemainingProofUrl(url);
              setRemainingProofPreview(preview);
            }}
          />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-[68px] z-30 px-4">
        <div className="mx-auto max-w-2xl rounded-2xl bg-brand-navy p-3 text-white shadow-aww-lg">
          <div className="mb-2 flex items-center justify-between text-xs text-white/70">
            <span>{CUSTOMER_PAYMENT_MODE_LABELS[mode]}</span>
            <span>{summaryLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-white/60">Total estimasi</p>
              <p className="font-display text-lg font-bold">{rupiah(totalPrice)}</p>
            </div>
            <Button
              variant="rainbow"
              onClick={handleSubmit}
              disabled={loading || !!validationError}
              className="px-6"
            >
              <Wallet className="h-4 w-4" />
              {loading ? 'Memproses...' : 'Konfirmasi & Pesan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
