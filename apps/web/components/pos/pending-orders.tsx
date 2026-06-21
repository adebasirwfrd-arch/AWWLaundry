'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, X, Package, Clock, ShoppingBag, Scale, CreditCard, Layers, Hourglass } from 'lucide-react';
import {
  formatCurrency,
  PAYMENT_METHOD_LABELS,
  methodNeedsProof,
  type SplitPaymentMethod,
  type RemainingTiming,
  type CombinationPaymentInput,
  type CustomerOrderPaymentInput,
  CUSTOMER_PAYMENT_MODE_LABELS,
} from '@aww/shared';
import { confirmOrderWithPayment, rejectOrder, type ConfirmPaymentMethod } from '@/app/actions/orders-staff';
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
import { QrisPaymentDisplay } from '@/components/pos/qris-payment-display';
import {
  CombinationPaymentForm,
  type CombinationFormState,
} from '@/components/pos/combination-payment-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast';

interface PendingOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  serviceName: string;
  itemCount: number;
  total: number;
  discount: number;
  weightKg: number;
  pricePerKg: number;
  isKiloan: boolean;
  createdAt: string;
  notes?: string | null;
  paymentPlan?: CombinationPaymentInput | null;
  customerPayment?: CustomerOrderPaymentInput | null;
  payments: { method: string; amount: number; proofUrl?: string | null }[];
  items: { description: string; qty: number; unitPrice: number; total: number }[];
}

const SINGLE_OPTIONS: { value: ConfirmPaymentMethod | 'COMBINATION'; label: string }[] = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'BANK_TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'COMBINATION', label: 'Kombinasi (DP)' },
];

const defaultCombination: CombinationFormState = {
  dpMethod: 'CASH',
  dpAmount: '',
  remainingMethod: 'QRIS',
  remainingTiming: 'LATER',
};

export function PendingOrders({ orders }: { orders: PendingOrder[] }) {
  const [list, setList] = useState(orders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'SINGLE' | 'COMBINATION'>('SINGLE');
  const [paymentMethod, setPaymentMethod] = useState<ConfirmPaymentMethod>('CASH');
  const [combination, setCombination] = useState<CombinationFormState>(defaultCombination);
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [verifiedTotal, setVerifiedTotal] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [dpProofUrl, setDpProofUrl] = useState<string | null>(null);
  const [dpProofPreview, setDpProofPreview] = useState<string | null>(null);
  const [remainingProofUrl, setRemainingProofUrl] = useState<string | null>(null);
  const [remainingProofPreview, setRemainingProofPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const expanded = list.find((o) => o.id === expandedId);

  const computedTotal = useMemo(() => {
    if (!expanded) return 0;
    if (expanded.isKiloan) {
      const w = parseFloat(verifiedWeight) || expanded.weightKg || 0;
      return Math.max(0, Math.round(w * expanded.pricePerKg) - expanded.discount);
    }
    return parseFloat(verifiedTotal) || expanded.total;
  }, [expanded, verifiedWeight, verifiedTotal]);

  const dpNum = parseFloat(combination.dpAmount) || 0;
  const remainingTotal = Math.max(0, Math.round(computedTotal - dpNum));
  const hasPresetPlan = !!(expanded?.paymentPlan);

  function applyPaymentPlan(o: PendingOrder) {
    if (o.payments.length > 0) return;

    const plan = o.paymentPlan;
    if (plan) {
      setPaymentMode('COMBINATION');
      setCombination({
        dpMethod: plan.dpMethod,
        dpAmount: String(plan.dpAmount),
        remainingMethod: plan.remainingMethod,
        remainingTiming: plan.remainingTiming,
      });
      return;
    }

    if (o.customerPayment?.mode === 'CASH') {
      setPaymentMode('SINGLE');
      setPaymentMethod('CASH');
      return;
    }

    if (o.customerPayment?.mode === 'QRIS') {
      setPaymentMode('SINGLE');
      setPaymentMethod('QRIS');
      return;
    }

    if (o.customerPayment?.mode === 'BANK_TRANSFER') {
      setPaymentMode('SINGLE');
      setPaymentMethod('BANK_TRANSFER');
      return;
    }

    if (o.customerPayment?.mode === 'PAY_LATER') {
      setPaymentMode('SINGLE');
      setPaymentMethod('CASH');
      return;
    }

    setPaymentMode('SINGLE');
    setPaymentMethod('CASH');
    setCombination(defaultCombination);
  }

  function openConfirm(o: PendingOrder) {
    setExpandedId(o.id);
    setVerifiedWeight(o.weightKg > 0 ? String(o.weightKg) : '');
    setVerifiedTotal(String(o.total));
    setProofUrl(null);
    setProofPreview(null);
    setDpProofUrl(null);
    setDpProofPreview(null);
    setRemainingProofUrl(null);
    setRemainingProofPreview(null);
    applyPaymentPlan(o);
  }

  function selectPaymentOption(value: ConfirmPaymentMethod | 'COMBINATION') {
    if (value === 'COMBINATION') {
      setPaymentMode('COMBINATION');
      if (!combination.dpAmount && computedTotal > 0) {
        setCombination((s) => ({ ...s, dpAmount: String(Math.round(computedTotal * 0.5)) }));
      }
      setProofUrl(null);
      setProofPreview(null);
      return;
    }
    setPaymentMode('SINGLE');
    setPaymentMethod(value);
    setProofUrl(null);
    setProofPreview(null);
  }

  const singleNeedsProof = paymentMode === 'SINGLE' && methodNeedsProof(paymentMethod);

  function validateConfirm(prepaid: boolean, payLater: boolean): string | null {
    if (prepaid || payLater) return null;
    if (paymentMode === 'COMBINATION') {
      if (dpNum <= 0) return 'Masukkan jumlah DP awal';
      if (dpNum >= computedTotal) return 'Jumlah DP harus kurang dari total';
      if (methodNeedsProof(combination.dpMethod) && !dpProofUrl) {
        return 'Upload bukti pembayaran DP awal';
      }
      if (methodNeedsProof(combination.dpMethod) && dpProofPreview && !dpProofUrl) {
        return 'Tunggu upload bukti DP selesai';
      }
      if (combination.remainingTiming === 'NOW') {
        if (methodNeedsProof(combination.remainingMethod) && !remainingProofUrl) {
          return 'Upload bukti pelunasan sisa';
        }
        if (methodNeedsProof(combination.remainingMethod) && remainingProofPreview && !remainingProofUrl) {
          return 'Tunggu upload bukti pelunasan selesai';
        }
      }
      return null;
    }
    if (singleNeedsProof && !proofUrl) return 'Upload bukti pembayaran terlebih dahulu';
    if (proofPreview && !proofUrl) return 'Tunggu upload bukti selesai';
    return null;
  }

  function act(id: string, kind: 'confirm' | 'reject') {
    setBusyId(id);
    const snapshot = list;
    if (kind === 'reject') {
      setList((prev) => prev.filter((x) => x.id !== id));
      setExpandedId(null);
    }
    startTransition(async () => {
      try {
        if (kind === 'confirm') {
          const o = snapshot.find((x) => x.id === id);
          if (!o) return;
          const prepaid = o.payments.length > 0;
          const payLater = o.customerPayment?.mode === 'PAY_LATER';
          const err = validateConfirm(prepaid, payLater);
          if (err) throw new Error(err);

          await confirmOrderWithPayment(
            prepaid || payLater
              ? {
                  orderId: id,
                  verifiedWeightKg: o.isKiloan ? parseFloat(verifiedWeight) || undefined : undefined,
                  verifiedTotal: computedTotal,
                }
              : {
                  orderId: id,
                  paymentMethod: paymentMode === 'SINGLE' ? paymentMethod : undefined,
                  combinationPayment:
                    paymentMode === 'COMBINATION'
                      ? {
                          dpMethod: combination.dpMethod as SplitPaymentMethod,
                          dpAmount: dpNum,
                          dpProofUrl: methodNeedsProof(combination.dpMethod) ? dpProofUrl ?? undefined : undefined,
                          remainingMethod: combination.remainingMethod as SplitPaymentMethod,
                          remainingTiming: combination.remainingTiming as RemainingTiming,
                          remainingProofUrl:
                            combination.remainingTiming === 'NOW' && methodNeedsProof(combination.remainingMethod)
                              ? remainingProofUrl ?? undefined
                              : undefined,
                        }
                      : undefined,
                  verifiedWeightKg: o.isKiloan ? parseFloat(verifiedWeight) || undefined : undefined,
                  verifiedTotal: computedTotal,
                  proofUrl: paymentMode === 'SINGLE' && singleNeedsProof ? proofUrl ?? undefined : undefined,
                }
          );
          setList((prev) => prev.filter((x) => x.id !== id));
          setExpandedId(null);
          toast.success('Pesanan dikonfirmasi');
        } else {
          await rejectOrder(id);
          toast.success('Pesanan ditolak');
        }
      } catch (e) {
        if (kind === 'reject') setList(snapshot);
        toast.error(e instanceof Error ? e.message : 'Gagal memproses pesanan');
      } finally {
        setBusyId(null);
      }
    });
  }

  const confirmDisabled =
    (pending && !!busyId) ||
    (expanded &&
      expanded.payments.length === 0 &&
      expanded.customerPayment?.mode !== 'PAY_LATER' &&
      paymentMode === 'SINGLE' &&
      singleNeedsProof &&
      !proofUrl) ||
    (expanded &&
      expanded.payments.length === 0 &&
      expanded.customerPayment?.mode !== 'PAY_LATER' &&
      paymentMode === 'SINGLE' &&
      !!proofPreview &&
      !proofUrl);

  if (list.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-12 text-center text-brand-navy/40">
        <Package className="mx-auto mb-2 h-10 w-10" />
        <p className="font-medium text-brand-navy/60">Tidak ada pesanan menunggu konfirmasi</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((o) => (
        <div key={o.id} className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-white">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-brand-navy">{o.customerName}</p>
                <p className="font-mono text-[11px] text-brand-navy/45">{o.orderNumber}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              o.payments.length > 0
                ? 'bg-rainbow-green/20 text-rainbow-green'
                : o.customerPayment?.mode === 'PAY_LATER'
                  ? 'bg-rainbow-orange/20 text-rainbow-orange'
                  : 'bg-amber-400/20 text-amber-700'
            }`}>
              {o.payments.length > 0
                ? 'Bayar via app · perlu konfirmasi'
                : o.customerPayment?.mode === 'PAY_LATER'
                  ? 'Bayar nanti · perlu konfirmasi'
                  : 'Belum diterima · Belum bayar'}
            </span>
          </div>

          {o.customerPayment?.mode === 'PAY_LATER' && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-rainbow-orange/10 px-3 py-2 text-xs text-brand-navy">
              <Hourglass className="h-3.5 w-3.5 text-rainbow-orange" />
              Pelanggan pilih bayar nanti — konfirmasi setelah cucian diterima, bayar saat selesai
            </div>
          )}

          {o.paymentPlan && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-rainbow-purple/10 px-3 py-2 text-xs text-brand-navy">
              <Layers className="h-3.5 w-3.5 text-rainbow-purple" />
              Rencana bayar: DP {PAYMENT_METHOD_LABELS[o.paymentPlan.dpMethod]} {formatCurrency(o.paymentPlan.dpAmount)}
              {' · '}sisa via {PAYMENT_METHOD_LABELS[o.paymentPlan.remainingMethod]}
              {o.paymentPlan.remainingTiming === 'LATER' ? ' (nanti)' : ' (sekarang)'}
            </div>
          )}

          <div className="mt-3 rounded-2xl bg-white/70 p-3 text-sm">
            <p className="font-medium text-brand-navy">{o.serviceName}</p>
            {o.isKiloan ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-brand-navy/55">
                <Scale className="h-3.5 w-3.5" /> Estimasi {o.weightKg || '?'} kg · {formatCurrency(o.pricePerKg)}/kg
              </p>
            ) : (
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-brand-navy/55">
                {o.items.map((it, i) => (
                  <span key={i}>{it.qty}× {it.description.replace(/\s*\(.*\)$/, '')}</span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-brand-navy/55">
              <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {o.isKiloan ? 'Kiloan' : `${o.itemCount} item`}</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(o.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <p className="font-display text-base font-bold text-brand-orange">{formatCurrency(o.total)}</p>
          </div>

          {expandedId === o.id ? (
            <div className="mt-4 space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                <CreditCard className="h-4 w-4 text-rainbow-cyan" /> Verifikasi & Pembayaran
              </p>

              {o.isKiloan ? (
                <Input
                  id={`weight-${o.id}`}
                  label="Berat timbang (kg)"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={verifiedWeight}
                  onChange={(e) => setVerifiedWeight(e.target.value)}
                />
              ) : (
                <p className="text-xs text-brand-navy/55">Pastikan jumlah pakaian sesuai daftar di atas.</p>
              )}

              {o.payments.length > 0 ? (
                <div className="rounded-xl border border-rainbow-green/25 bg-rainbow-green/5 p-4">
                  <p className="text-sm font-semibold text-brand-navy">Pembayaran sudah dilakukan via aplikasi</p>
                  <div className="mt-2 space-y-1 text-sm">
                    {o.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-brand-navy/75">
                        <span>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                        <span className="font-semibold">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                  {o.customerPayment && (
                    <p className="mt-2 text-xs text-brand-navy/55">
                      Metode: {CUSTOMER_PAYMENT_MODE_LABELS[o.customerPayment.mode]}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-brand-navy/55">
                    Verifikasi berat/total — bukti bayar ada di detail pesanan.
                  </p>
                </div>
              ) : o.customerPayment?.mode === 'PAY_LATER' ? (
                <div className="rounded-xl border border-rainbow-orange/25 bg-rainbow-orange/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                    <Hourglass className="h-4 w-4 text-rainbow-orange" />
                    Bayar Nanti — setelah selesai
                  </p>
                  <p className="mt-2 text-sm text-brand-navy/70">
                    Pelanggan memilih bayar setelah cucian selesai. Verifikasi berat/total, terima cucian,
                    lalu konfirmasi — pembayaran dilakukan saat pengambilan.
                  </p>
                  <p className="mt-2 text-xs text-brand-navy/55">
                    Metode: {CUSTOMER_PAYMENT_MODE_LABELS.PAY_LATER}
                  </p>
                </div>
              ) : (
                <>
                  {hasPresetPlan && (
                    <p className="rounded-xl bg-brand-sky/10 px-3 py-2 text-xs text-brand-navy/70">
                      Rencana pembayaran sudah tercatat — periksa apakah sudah sesuai, lalu konfirmasi.
                    </p>
                  )}

                  <div>
                    <p className="mb-2 text-sm font-medium text-brand-navy">Metode Pembayaran</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {SINGLE_OPTIONS.map((opt) => {
                        const active =
                          opt.value === 'COMBINATION'
                            ? paymentMode === 'COMBINATION'
                            : paymentMode === 'SINGLE' && paymentMethod === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => selectPaymentOption(opt.value)}
                            className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                              active
                                ? 'border-rainbow-cyan bg-rainbow-cyan/10 text-brand-navy'
                                : 'border-brand-navy/10 text-brand-navy/60 hover:border-rainbow-cyan/40'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {paymentMode === 'COMBINATION' ? (
                    <CombinationPaymentForm
                      total={computedTotal}
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
                  ) : (
                    <>
                      {paymentMethod === 'QRIS' && computedTotal > 0 && (
                        <QrisPaymentDisplay
                          amount={computedTotal}
                          reference={o.orderNumber}
                          label="QRIS — scan dengan nominal total"
                        />
                      )}
                      {singleNeedsProof && (
                        <PaymentProofCapture
                          required
                          category="payment-proof"
                          proofPreview={proofPreview}
                          proofUrl={proofUrl}
                          onProofChange={(url, preview) => {
                            setProofUrl(url);
                            setProofPreview(preview);
                          }}
                        />
                      )}
                    </>
                  )}
                </>
              )}

              <div className="rounded-xl bg-brand-sky/10 px-4 py-3 text-center">
                {expanded && expanded.discount > 0 && (
                  <p className="mb-1 text-xs text-rainbow-green">
                    Diskon redeem poin: −{formatCurrency(expanded.discount)} (gratis 1 kg)
                  </p>
                )}
                {!o.payments.length && paymentMode === 'COMBINATION' && dpNum > 0 && dpNum < computedTotal ? (
                  <>
                    <p className="text-xs text-brand-navy/50">DP sekarang · Sisa nanti</p>
                    <div className="mt-1 flex justify-center gap-4 text-sm">
                      <span>DP: <strong className="text-brand-orange">{formatCurrency(dpNum)}</strong></span>
                      <span>Sisa: <strong className="text-amber-700">{formatCurrency(remainingTotal)}</strong></span>
                    </div>
                    <p className="mt-1 text-xs text-brand-navy/45">Total order: {formatCurrency(computedTotal)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-brand-navy/50">
                      {o.payments.length > 0
                        ? 'Total setelah timbang'
                        : o.customerPayment?.mode === 'PAY_LATER'
                          ? 'Total tagihan (bayar nanti)'
                          : 'Total dibayar'}
                    </p>
                    <p className="font-display text-2xl font-extrabold text-brand-orange">{formatCurrency(computedTotal)}</p>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setExpandedId(null)} disabled={pending}>
                  Batal
                </Button>
                <Button
                  variant="rainbow"
                  className="flex-[2]"
                  disabled={confirmDisabled}
                  onClick={() => act(o.id, 'confirm')}
                >
                  <Check className="h-4 w-4" />
                  {busyId === o.id && pending
                    ? 'Memproses...'
                    : o.payments.length > 0
                      ? 'Konfirmasi Pesanan'
                      : o.customerPayment?.mode === 'PAY_LATER'
                        ? 'Konfirmasi (Bayar Nanti)'
                        : 'Konfirmasi & Terima Bayar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => act(o.id, 'reject')}
                disabled={pending && busyId === o.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Tolak
              </button>
              <button
                onClick={() => openConfirm(o)}
                disabled={pending && busyId === o.id}
                className="flex flex-[2] items-center justify-center gap-1.5 rounded-xl bg-aww-payment px-3 py-2.5 text-sm font-semibold text-white shadow-aww-glow-rainbow transition-transform hover:scale-[1.02] disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Verifikasi & Bayar
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
