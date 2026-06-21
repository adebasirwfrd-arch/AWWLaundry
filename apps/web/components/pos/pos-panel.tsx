'use client';

import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Scale, Printer, User, Phone, Weight, Plus, Wallet, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CelebrationBurst } from '@/components/animations/celebration-burst';
import { WaterDropletMascot } from '@/components/brand/water-droplet-mascot';
import { ThermalReceipt, type ReceiptData } from '@/components/pos/thermal-receipt';
import { ScalePanel } from '@/components/pos/scale-panel';
import { printThermalReceipt } from '@/lib/thermal-print';
import { createOrder } from '@/app/actions/orders';
import { generateOrderQrisPayload } from '@/app/actions/qris';
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
import { QrisPaymentDisplay } from '@/components/pos/qris-payment-display';
import {
  CombinationPaymentForm,
  TransferBankInfo,
  type CombinationFormState,
} from '@/components/pos/combination-payment-form';
import { usePosDraftStore } from '@/stores/pos-draft-store';
import { toast } from '@/lib/toast';
import {
  formatCurrency,
  formatWeight,
  PAYMENT_METHOD_LABELS,
  methodNeedsProof,
  formatPaymentSummary,
  type SplitPaymentMethod,
  type RemainingTiming,
  type TransferBankDetails,
} from '@aww/shared';

interface ServiceType {
  id: string;
  name: string;
  pricePerKg: number;
}

interface POSPanelProps {
  services: ServiceType[];
  branchName: string;
  branchPhone?: string;
  bankDetails?: TransferBankDetails;
}

export function POSPanel({ services, branchName, branchPhone, bankDetails }: POSPanelProps) {
  const customerName = usePosDraftStore((s) => s.customerName);
  const customerPhone = usePosDraftStore((s) => s.customerPhone);
  const weight = usePosDraftStore((s) => s.weight);
  const serviceId = usePosDraftStore((s) => s.serviceId);
  const paymentMethod = usePosDraftStore((s) => s.paymentMethod);
  const dpMethod = usePosDraftStore((s) => s.dpMethod);
  const dpAmount = usePosDraftStore((s) => s.dpAmount);
  const remainingMethod = usePosDraftStore((s) => s.remainingMethod);
  const remainingTiming = usePosDraftStore((s) => s.remainingTiming);
  const setField = usePosDraftStore((s) => s.setField);
  const clearDraft = usePosDraftStore((s) => s.clearDraft);

  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [dpProofUrl, setDpProofUrl] = useState<string | null>(null);
  const [dpProofPreview, setDpProofPreview] = useState<string | null>(null);
  const [remainingProofUrl, setRemainingProofUrl] = useState<string | null>(null);
  const [remainingProofPreview, setRemainingProofPreview] = useState<string | null>(null);
  const shouldAutoPrint = useRef(false);

  const isCombination = paymentMethod === 'COMBINATION';

  useEffect(() => {
    if (!serviceId && services[0]?.id) {
      setField('serviceId', services[0].id);
    }
  }, [serviceId, services, setField]);

  const selectedService = services.find((s) => s.id === serviceId);
  const weightNum = parseFloat(weight) || 0;
  const total = weightNum * (selectedService?.pricePerKg ?? 0);
  const needsProof = !isCombination && methodNeedsProof(paymentMethod);
  const dpNum = parseFloat(dpAmount) || 0;
  const remainingTotal = Math.max(0, Math.round(total - dpNum));

  const combinationState: CombinationFormState = {
    dpMethod,
    dpAmount,
    remainingMethod,
    remainingTiming,
  };

  useEffect(() => {
    if (receipt?.paid && shouldAutoPrint.current) {
      shouldAutoPrint.current = false;
      void printThermalReceipt();
    }
  }, [receipt]);

  function validatePayment(pay: boolean): string | null {
    if (!pay) return null;

    if (isCombination) {
      if (dpNum <= 0) return 'Masukkan jumlah DP awal';
      if (dpNum >= total) return 'Jumlah DP harus kurang dari total';
      if (methodNeedsProof(dpMethod) && !dpProofUrl) {
        return 'Upload bukti pembayaran DP awal';
      }
      if (methodNeedsProof(dpMethod) && dpProofPreview && !dpProofUrl) {
        return 'Tunggu upload bukti DP selesai';
      }
      if (remainingTiming === 'NOW') {
        if (methodNeedsProof(remainingMethod) && !remainingProofUrl) {
          return 'Upload bukti pelunasan sisa';
        }
        if (methodNeedsProof(remainingMethod) && remainingProofPreview && !remainingProofUrl) {
          return 'Tunggu upload bukti pelunasan selesai';
        }
      }
      return null;
    }

    if (proofPreview && !proofUrl) return 'Tunggu upload bukti pembayaran selesai';
    if (needsProof && !proofUrl) return 'Upload bukti pembayaran untuk Transfer atau QRIS';
    return null;
  }

  async function buildReceiptData(
    order: Awaited<ReturnType<typeof createOrder>>,
    pay: boolean
  ): Promise<ReceiptData> {
    const base: ReceiptData = {
      orderNumber: order.orderNumber,
      total: order.total,
      weightKg: order.weightKg,
      customerName: order.customer.name,
      customerPhone,
      serviceName: order.serviceType.name,
      pricePerKg: selectedService?.pricePerKg,
      estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? '',
      orderStatus: 'ON_HOLD',
      paid: pay,
      branchName,
      branchPhone,
      trackUrl: `${window.location.origin}/track?order=${order.orderNumber}`,
    };

    if (!pay) {
      return { ...base, paymentStatus: 'UNPAID', paymentMethod: 'Belum Bayar' };
    }

    if (order.combinationPlan) {
      const plan = order.combinationPlan;
      const paymentLines = plan.payments.map((p) => ({
        method: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        amount: p.amount,
        label: p.label,
      }));

      let remainingQrisPayload: string | undefined;
      if (
        plan.remainingTiming === 'LATER' &&
        plan.remainingMethod === 'QRIS' &&
        plan.remainingAmount > 0
      ) {
        try {
          const qris = await generateOrderQrisPayload(order.orderNumber, plan.remainingAmount);
          remainingQrisPayload = qris.payload;
        } catch {
          // QRIS config may be missing — receipt still prints without payment QR
        }
      }

      return {
        ...base,
        paymentStatus: plan.remainingTiming === 'LATER' ? 'PARTIAL' : 'PAID',
        paymentMethod: formatPaymentSummary(
          plan.payments.map((p) => ({ ...p, method: PAYMENT_METHOD_LABELS[p.method] ?? p.method })),
          PAYMENT_METHOD_LABELS
        ),
        payments: paymentLines,
        remainingAmount: plan.remainingTiming === 'LATER' ? plan.remainingAmount : undefined,
        remainingMethod:
          plan.remainingTiming === 'LATER' && plan.remainingMethod
            ? PAYMENT_METHOD_LABELS[plan.remainingMethod]
            : undefined,
        remainingQrisPayload,
      };
    }

    return {
      ...base,
      paymentStatus: 'PAID',
      paymentMethod: PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod,
    };
  }

  async function handleSubmit(pay: boolean) {
    if (!customerName || !customerPhone || !weightNum || !serviceId) return;

    const validationError = validatePayment(pay);
    if (validationError) {
      alert(validationError);
      return;
    }

    setLoading(true);

    try {
      const order = await createOrder({
        customerName,
        customerPhone,
        weightKg: weightNum,
        serviceTypeId: serviceId,
        paymentMethod: pay && !isCombination ? paymentMethod : undefined,
        proofUrl: pay && !isCombination && needsProof ? proofUrl ?? undefined : undefined,
        combinationPayment:
          pay && isCombination
            ? {
                dpMethod: dpMethod as SplitPaymentMethod,
                dpAmount: dpNum,
                dpProofUrl: methodNeedsProof(dpMethod) ? dpProofUrl ?? undefined : undefined,
                remainingMethod: remainingMethod as SplitPaymentMethod,
                remainingTiming: remainingTiming as RemainingTiming,
                remainingProofUrl:
                  remainingTiming === 'NOW' && methodNeedsProof(remainingMethod)
                    ? remainingProofUrl ?? undefined
                    : undefined,
              }
            : undefined,
      });

      shouldAutoPrint.current = pay;
      setReceipt(await buildReceiptData(order, pay));

      if (pay) setCelebrate(true);

      toast.success('Pesanan masuk Kotak Masuk — buka tab Konfirmasi untuk mulai produksi');

      clearDraft();
      setProofUrl(null);
      setProofPreview(null);
      setDpProofUrl(null);
      setDpProofPreview(null);
      setRemainingProofUrl(null);
      setRemainingProofPreview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat order');
    } finally {
      setLoading(false);
    }
  }

  const submitDisabled =
    loading ||
    !weightNum ||
    (!isCombination && needsProof && !proofUrl) ||
    (!!proofPreview && !proofUrl);

  return (
    <div data-pos-grid className="grid gap-6 lg:grid-cols-2">
      <CelebrationBurst
        show={celebrate}
        title="Pembayaran Diterima!"
        subtitle={receipt ? formatCurrency(receipt.total) : ''}
        onDone={() => setCelebrate(false)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand-orange" />
            Penerimaan Cucian
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="name" label="Nama Pelanggan" value={customerName} onChange={(e) => setField('customerName', e.target.value)} placeholder="Budi Santoso" />
            <Input id="phone" label="No. Telepon" value={customerPhone} onChange={(e) => setField('customerPhone', e.target.value)} placeholder="081234567890" />
          </div>

          <ScalePanel />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Input id="weight" label="Berat (kg)" type="number" step="0.1" min="0.1" value={weight} onChange={(e) => setField('weight', e.target.value)} placeholder="0.00" />
              <p className="mt-1 text-xs text-brand-navy/50">Auto dari timbangan USB atau input manual</p>
            </div>
            <Select
              id="service"
              label="Jenis Layanan"
              value={serviceId}
              onChange={(e) => setField('serviceId', e.target.value)}
              options={services.map((s) => ({ value: s.id, label: `${s.name} — ${formatCurrency(s.pricePerKg)}/kg` }))}
            />
          </div>

          <Select
            id="payment"
            label="Metode Pembayaran"
            value={paymentMethod}
            onChange={(e) => {
              setField('paymentMethod', e.target.value);
              setProofUrl(null);
              setProofPreview(null);
              setDpProofUrl(null);
              setDpProofPreview(null);
              setRemainingProofUrl(null);
              setRemainingProofPreview(null);
            }}
            options={[
              { value: 'CASH', label: 'Tunai' },
              { value: 'QRIS', label: 'QRIS' },
              { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
              { value: 'COMBINATION', label: 'Kombinasi (DP)' },
            ]}
          />

          {isCombination ? (
            <CombinationPaymentForm
              total={total}
              state={combinationState}
              onChange={(patch) => {
                if (patch.dpMethod !== undefined) setField('dpMethod', patch.dpMethod);
                if (patch.dpAmount !== undefined) setField('dpAmount', patch.dpAmount);
                if (patch.remainingMethod !== undefined) setField('remainingMethod', patch.remainingMethod);
                if (patch.remainingTiming !== undefined) setField('remainingTiming', patch.remainingTiming);
              }}
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
              bankDetails={bankDetails}
            />
          ) : (
            <>
              {paymentMethod === 'BANK_TRANSFER' && (
                <TransferBankInfo amount={total} bankDetails={bankDetails} />
              )}
              {paymentMethod === 'QRIS' && total > 0 && (
                <QrisPaymentDisplay amount={total} label="QRIS — scan dengan nominal total transaksi" />
              )}
              {paymentMethod === 'QRIS' && total <= 0 && (
                <p className="rounded-xl bg-rainbow-purple/10 px-3 py-2 text-xs text-brand-navy/70">
                  Masukkan berat cucian — QRIS akan menampilkan nominal sesuai total transaksi.
                </p>
              )}
              {needsProof && (
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

          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-sky/15 to-rainbow-cyan/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-navy/70">
                <Weight className="h-5 w-5" />
                <span className="font-medium">{formatWeight(weightNum)}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-brand-navy/60">Total</p>
                <p className="font-display text-3xl font-bold text-brand-orange">{formatCurrency(total)}</p>
                {isCombination && dpNum > 0 && dpNum < total && (
                  <p className="text-xs text-brand-navy/50">
                    DP {formatCurrency(dpNum)} · Sisa {formatCurrency(remainingTotal)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => handleSubmit(false)} disabled={loading || !weightNum}>
              <Plus className="h-4 w-4" /> Bayar Nanti
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => handleSubmit(true)} disabled={submitDisabled}>
              {loading ? 'Memproses...' : (<><Wallet className="h-4 w-4" /> Bayar & Print</>)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-rainbow-cyan" />
            Struk & QR Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receipt ? (
            <div className="space-y-4">
              <div className="mx-auto max-w-xs rounded-2xl border-2 border-dashed border-brand-navy/15 bg-white p-6 text-center shadow-aww-sm">
                <h3 className="font-display text-xl font-bold text-brand-navy">AWW LAUNDRY</h3>
                <p className="text-xs font-semibold text-brand-pink">FRESH • CLEAN • FUN</p>
                <p className="mt-1 text-xs text-brand-navy/60">{branchName}</p>
                <div className="my-3 border-t border-dashed border-brand-navy/15" />
                <p className="font-mono text-base font-bold text-brand-navy">{receipt.orderNumber}</p>
                <div className="mt-3 space-y-1 text-left text-sm">
                  <p className="flex items-center gap-2 text-brand-navy/80"><User className="h-4 w-4" /> {receipt.customerName}</p>
                  <p className="text-brand-navy/70">Layanan: {receipt.serviceName}</p>
                  <p className="text-brand-navy/70">Berat: {formatWeight(receipt.weightKg)}</p>
                </div>
                <div className="my-3 border-t border-dashed border-brand-navy/15" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-navy/60">Total</span>
                  <span className="font-display text-xl font-bold text-brand-orange">{formatCurrency(receipt.total)}</span>
                </div>

                {receipt.payments && receipt.payments.length > 0 ? (
                  <div className="mt-3 space-y-1 text-left text-xs">
                    {receipt.payments.map((p, i) => (
                      <div key={i} className="flex justify-between text-brand-navy/75">
                        <span>{p.label ? `${p.label}: ` : ''}{p.method}</span>
                        <span>{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                    {(receipt.remainingAmount ?? 0) > 0 && (
                      <div className="flex justify-between font-semibold text-amber-700">
                        <span>Sisa ({receipt.remainingMethod})</span>
                        <span>{formatCurrency(receipt.remainingAmount!)}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                  receipt.paymentStatus === 'PARTIAL'
                    ? 'bg-amber-100 text-amber-700'
                    : receipt.paid
                      ? 'bg-rainbow-green/15 text-rainbow-green'
                      : 'bg-amber-100 text-amber-600'
                }`}>
                  {receipt.paymentStatus === 'PARTIAL'
                    ? 'DP DITERIMA'
                    : receipt.paid
                      ? `LUNAS · ${receipt.paymentMethod}`
                      : 'BELUM BAYAR'}
                </span>
                {receipt.orderStatus === 'ON_HOLD' && (
                  <p className="mt-2 text-xs font-medium text-amber-700">
                    Menunggu konfirmasi di Kotak Masuk sebelum masuk produksi
                  </p>
                )}

                <div className="mt-4 flex justify-center">
                  <div className="rounded-xl bg-white p-2 shadow-aww-sm">
                    <QRCodeSVG value={receipt.trackUrl} size={110} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-brand-navy/50">Scan untuk lacak status cucian</p>

                {receipt.remainingQrisPayload && (receipt.remainingAmount ?? 0) > 0 && (
                  <div className="mt-4 rounded-xl border border-rainbow-purple/20 bg-rainbow-purple/5 p-3">
                    <p className="text-xs font-semibold text-rainbow-purple">QRIS Pelunasan</p>
                    <p className="text-sm font-bold text-brand-orange">{formatCurrency(receipt.remainingAmount!)}</p>
                    <div className="mt-2 flex justify-center">
                      <QRCodeSVG value={receipt.remainingQrisPayload} size={100} />
                    </div>
                    <p className="mt-1 text-[10px] text-brand-navy/50">Scan saat pelunasan — nominal sesuai sisa</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => window.print()} className="flex-1">
                  <Printer className="h-4 w-4" /> Print Struk
                </Button>
                <Button variant="outline" onClick={() => setReceipt(null)} className="flex-1">
                  Order Baru
                </Button>
              </div>

              <ThermalReceipt data={receipt} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-brand-navy/50">
              <WaterDropletMascot className="h-24 w-24" wave />
              <p className="font-medium">Struk akan muncul setelah order dibuat</p>
              <p className="flex items-center gap-1 text-xs text-brand-navy/40">
                <Sparkles className="h-3 w-3" /> Timbang → Bayar → Print otomatis
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
