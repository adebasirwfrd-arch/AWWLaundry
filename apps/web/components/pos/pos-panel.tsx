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
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
import { usePosDraftStore } from '@/stores/pos-draft-store';
import { toast } from '@/lib/toast';
import { formatCurrency, formatWeight, PAYMENT_METHOD_LABELS } from '@aww/shared';

interface ServiceType {
  id: string;
  name: string;
  pricePerKg: number;
}

interface POSPanelProps {
  services: ServiceType[];
  branchName: string;
  branchPhone?: string;
}

export function POSPanel({ services, branchName, branchPhone }: POSPanelProps) {
  const customerName = usePosDraftStore((s) => s.customerName);
  const customerPhone = usePosDraftStore((s) => s.customerPhone);
  const weight = usePosDraftStore((s) => s.weight);
  const serviceId = usePosDraftStore((s) => s.serviceId);
  const paymentMethod = usePosDraftStore((s) => s.paymentMethod);
  const setField = usePosDraftStore((s) => s.setField);
  const clearDraft = usePosDraftStore((s) => s.clearDraft);

  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const shouldAutoPrint = useRef(false);

  useEffect(() => {
    if (!serviceId && services[0]?.id) {
      setField('serviceId', services[0].id);
    }
  }, [serviceId, services, setField]);

  const selectedService = services.find((s) => s.id === serviceId);
  const weightNum = parseFloat(weight) || 0;
  const total = weightNum * (selectedService?.pricePerKg ?? 0);
  const needsProof = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'QRIS';

  useEffect(() => {
    if (receipt?.paid && shouldAutoPrint.current) {
      shouldAutoPrint.current = false;
      void printThermalReceipt();
    }
  }, [receipt]);

  async function handleSubmit(pay: boolean) {
    if (!customerName || !customerPhone || !weightNum || !serviceId) return;
    if (pay && proofPreview && !proofUrl) {
      alert('Tunggu upload bukti pembayaran selesai');
      return;
    }
    if (pay && needsProof && !proofUrl) {
      alert('Upload bukti pembayaran untuk Transfer atau QRIS — tunggu hingga selesai');
      return;
    }
    setLoading(true);

    try {
      const order = await createOrder({
        customerName,
        customerPhone,
        weightKg: weightNum,
        serviceTypeId: serviceId,
        paymentMethod: pay ? paymentMethod : undefined,
        proofUrl: pay && needsProof ? proofUrl ?? undefined : undefined,
      });

      shouldAutoPrint.current = pay;
      setReceipt({
        orderNumber: order.orderNumber,
        total: order.total,
        weightKg: order.weightKg,
        customerName: order.customer.name,
        customerPhone,
        serviceName: order.serviceType.name,
        pricePerKg: selectedService?.pricePerKg,
        estimatedReadyAt: order.estimatedReadyAt?.toISOString() ?? '',
        paid: pay,
        paymentMethod: PAYMENT_METHOD_LABELS[paymentMethod],
        branchName,
        branchPhone,
        trackUrl: `${window.location.origin}/track?order=${order.orderNumber}`,
      });

      if (pay) setCelebrate(true);

      clearDraft();
      setProofUrl(null);
      setProofPreview(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-pos-grid className="grid gap-6 lg:grid-cols-2">
      <CelebrationBurst
        show={celebrate}
        title="Pembayaran Diterima!"
        subtitle={receipt ? formatCurrency(receipt.total) : ''}
        onDone={() => setCelebrate(false)}
      />

      {/* Input form */}
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
            }}
            options={[
              { value: 'CASH', label: 'Tunai' },
              { value: 'QRIS', label: 'QRIS' },
              { value: 'BANK_TRANSFER', label: 'Transfer Bank' },
            ]}
          />

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

          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-sky/15 to-rainbow-cyan/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-navy/70">
                <Weight className="h-5 w-5" />
                <span className="font-medium">{formatWeight(weightNum)}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-brand-navy/60">Total</p>
                <p className="font-display text-3xl font-bold text-brand-orange">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => handleSubmit(false)} disabled={loading || !weightNum}>
              <Plus className="h-4 w-4" /> Bayar Nanti
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => handleSubmit(true)} disabled={loading || !weightNum || (needsProof && !proofUrl) || (!!proofPreview && !proofUrl)}>
              {loading ? 'Memproses...' : (<><Wallet className="h-4 w-4" /> Bayar & Print</>)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipt preview */}
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
                <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${receipt.paid ? 'bg-rainbow-green/15 text-rainbow-green' : 'bg-amber-100 text-amber-600'}`}>
                  {receipt.paid ? `LUNAS · ${receipt.paymentMethod}` : 'BELUM BAYAR'}
                </span>
                <div className="mt-4 flex justify-center">
                  <div className="rounded-xl bg-white p-2 shadow-aww-sm">
                    <QRCodeSVG value={receipt.trackUrl} size={110} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-brand-navy/50">Scan untuk lacak status cucian</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={() => window.print()} className="flex-1">
                  <Printer className="h-4 w-4" /> Print Struk
                </Button>
                <Button variant="outline" onClick={() => setReceipt(null)} className="flex-1">
                  Order Baru
                </Button>
              </div>

              {/* Hidden thermal version for actual printing */}
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
