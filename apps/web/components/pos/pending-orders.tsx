'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, X, Package, Clock, ShoppingBag, Scale, CreditCard } from 'lucide-react';
import { formatCurrency } from '@aww/shared';
import { confirmOrderWithPayment, rejectOrder, type ConfirmPaymentMethod } from '@/app/actions/orders-staff';
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
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
  items: { description: string; qty: number; unitPrice: number; total: number }[];
}

const PAYMENT_OPTIONS: { value: ConfirmPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'BANK_TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
];

export function PendingOrders({ orders }: { orders: PendingOrder[] }) {
  const [list, setList] = useState(orders);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<ConfirmPaymentMethod>('CASH');
  const [verifiedWeight, setVerifiedWeight] = useState('');
  const [verifiedTotal, setVerifiedTotal] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
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

  function openConfirm(o: PendingOrder) {
    setExpandedId(o.id);
    setPaymentMethod('CASH');
    setVerifiedWeight(o.weightKg > 0 ? String(o.weightKg) : '');
    setVerifiedTotal(String(o.total));
    setProofUrl(null);
    setProofPreview(null);
  }

  const needsProof = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'QRIS';

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
          if (paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'QRIS') {
            if (!proofUrl) throw new Error('Upload bukti pembayaran terlebih dahulu — tunggu hingga selesai');
          }
          await confirmOrderWithPayment({
            orderId: id,
            paymentMethod,
            verifiedWeightKg: o.isKiloan ? parseFloat(verifiedWeight) || undefined : undefined,
            verifiedTotal: computedTotal,
            proofUrl: proofUrl ?? undefined,
          });
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
            <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Belum diterima · Belum bayar
            </span>
          </div>

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

              <div>
                <p className="mb-2 text-sm font-medium text-brand-navy">Metode Pembayaran</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                        paymentMethod === opt.value
                          ? 'border-rainbow-cyan bg-rainbow-cyan/10 text-brand-navy'
                          : 'border-brand-navy/10 text-brand-navy/60 hover:border-rainbow-cyan/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

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

              <div className="rounded-xl bg-brand-sky/10 px-4 py-3 text-center">
                {expanded && expanded.discount > 0 && (
                  <p className="mb-1 text-xs text-rainbow-green">
                    Diskon redeem poin: −{formatCurrency(expanded.discount)} (gratis 1 kg)
                  </p>
                )}
                <p className="text-xs text-brand-navy/50">Total dibayar</p>
                <p className="font-display text-2xl font-extrabold text-brand-orange">{formatCurrency(computedTotal)}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setExpandedId(null)} disabled={pending}>
                  Batal
                </Button>
                <Button
                  variant="rainbow"
                  className="flex-[2]"
                  disabled={(pending && busyId === o.id) || (needsProof && !proofUrl) || (!!proofPreview && !proofUrl)}
                  onClick={() => act(o.id, 'confirm')}
                >
                  <Check className="h-4 w-4" />
                  {busyId === o.id && pending ? 'Memproses...' : 'Konfirmasi & Terima Bayar'}
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
