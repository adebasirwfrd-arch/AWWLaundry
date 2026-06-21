'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import {
  Search,
  ArrowLeft,
  MapPin,
  Phone,
  Clock,
  Sparkles,
  PartyPopper,
  Package,
  Shirt,
  Wind,
  Flame,
  Layers,
  CheckCircle2,
  ScanLine,
  AlertCircle,
} from 'lucide-react';
import { AnimatedLogo } from '@/components/brand/animated-logo';
import { WashingMachine } from '@/components/brand/washing-machine';
import { WaterDropletMascot } from '@/components/brand/water-droplet-mascot';
import { CelebrationBurst } from '@/components/animations/celebration-burst';
import { QrTrackScanner } from '@/components/customer/qr-track-scanner';
import { Button } from '@/components/ui/button';
import { Barcode } from '@/components/ui/barcode';
import { OrderReviewForm } from '@/components/customer/order-review-form';
import { ORDER_STATUS_LABELS, formatCurrency, formatWeight, getEffectiveCustomerOrderStatus, getCustomerLaundryStatus } from '@aww/shared';
import { parseCustomerPaymentFromNotes } from '@/lib/payment-plan';
import { isOrderCompleted } from '@/lib/order-journey';

const JOURNEY = [
  { status: 'RECEIVED', label: 'Diterima', icon: Package, color: '#4ECDC4', desc: 'Cucian Anda sudah kami terima & timbang' },
  { status: 'WASHING', label: 'Mencuci', icon: Shirt, color: '#4A90D9', desc: 'Sedang dicuci bersih dengan deterjen premium' },
  { status: 'DRYING', label: 'Mengering', icon: Wind, color: '#9B59B6', desc: 'Proses pengeringan sempurna' },
  { status: 'IRONING', label: 'Menyetrika', icon: Flame, color: '#FF8C2A', desc: 'Disetrika rapi & wangi' },
  { status: 'FOLDING', label: 'Melipat', icon: Layers, color: '#FFD23F', desc: 'Dilipat rapi siap dikemas' },
  { status: 'READY', label: 'Siap Diambil', icon: CheckCircle2, color: '#6BCB77', desc: 'Cucian Anda sudah siap! 🎉' },
];

const PICKUP_JOURNEY = [
  { status: 'REQUESTED', label: 'Pesanan Diterima', icon: Package, color: '#4ECDC4', desc: 'Pesanan jemput Anda sudah kami terima' },
  { status: 'CONFIRMED', label: 'Dikonfirmasi', icon: CheckCircle2, color: '#4A90D9', desc: 'Kurir dijadwalkan untuk menjemput' },
  { status: 'PICKED_UP', label: 'Dijemput Kurir', icon: Package, color: '#FF8C2A', desc: 'Cucian Anda sedang diproses di cabang' },
  { status: 'COMPLETED', label: 'Selesai', icon: PartyPopper, color: '#6BCB77', desc: 'Cucian wangi & rapi sudah diantar balik 🎉' },
];

interface PickupResult {
  kind: 'pickup';
  trackingCode: string;
  status: string;
  customerName: string;
  serviceName: string;
  address: string;
  scheduleDate: string;
  scheduleSlot: string;
  estimatedKg: number | null;
  createdAt: string;
  branch: { name: string; phone: string | null; address: string | null };
}

interface TrackResult {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  notes?: string | null;
  weightKg: number;
  total: number;
  estimatedReadyAt: string | null;
  readyAt: string | null;
  canReview?: boolean;
  review?: { rating: number; note: string | null; createdAt: string } | null;
  customer: { name: string };
  serviceType: { name: string };
  branch: { name: string; phone: string | null; address: string | null };
  statusLogs: Array<{ toStatus: string; createdAt: string; note: string | null; changedBy: { name: string } }>;
}

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackContent />
    </Suspense>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackResult | null>(null);
  const [pickup, setPickup] = useState<PickupResult | null>(null);
  const [error, setError] = useState('');
  const [popupError, setPopupError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (num: string, opts?: { fromQr?: boolean }): Promise<boolean> => {
    if (!num.trim()) return false;
    setLoading(true);
    setError('');
    setPopupError('');
    setOrder(null);
    setPickup(null);
    try {
      const res = await fetch(`/api/v1/orders/track/${encodeURIComponent(num.trim())}`);
      if (!res.ok) {
        const msg = 'Pesanan tidak ditemukan';
        if (opts?.fromQr) setPopupError(msg);
        else setError(`${msg}. Periksa nomor / kode Anda.`);
        return false;
      }
      const data = await res.json();
      if (data.kind === 'pickup') {
        setPickup(data as PickupResult);
        if (data.status === 'COMPLETED') setTimeout(() => setCelebrate(true), 600);
      } else {
        setOrder(data as TrackResult);
        const customerPayment = parseCustomerPaymentFromNotes(data.notes);
        const eff = getEffectiveCustomerOrderStatus(
          data.status,
          data.paymentStatus,
          customerPayment?.mode
        );
        if (data.paymentStatus === 'PAID' && (eff === 'READY' || eff === 'PICKED_UP')) {
          setTimeout(() => setCelebrate(true), 600);
        }
      }
      return true;
    } catch {
      const msg = 'Gagal mencari pesanan';
      if (opts?.fromQr) setPopupError('Pesanan tidak ditemukan');
      else setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleQrScan(code: string) {
    setScanOpen(false);
    setOrderNumber(code);
    await runSearch(code, { fromQr: true });
  }

  function handleQrFailed() {
    setScanOpen(false);
    setPopupError('Pesanan tidak ditemukan');
  }

  useEffect(() => {
    const q = searchParams.get('order');
    if (q) {
      setOrderNumber(q);
      runSearch(q);
    }
  }, [searchParams, runSearch]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    runSearch(orderNumber);
  }

  useEffect(() => {
    if ((!order && !pickup) || !resultRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.from('.track-card', { y: 40, opacity: 0, duration: 0.7, ease: 'back.out(1.3)' })
        .from('.journey-step', { x: -20, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }, '-=0.3')
        .from('.track-detail', { y: 16, opacity: 0, duration: 0.4, stagger: 0.06 }, '-=0.4');
      gsap.fromTo('.progress-fill', { scaleY: 0 }, { scaleY: 1, duration: 1.2, ease: 'power2.out', transformOrigin: 'top', delay: 0.4 });
    }, resultRef);
    return () => ctx.revert();
  }, [order, pickup]);

  const trackStatus = order
    ? getEffectiveCustomerOrderStatus(
        order.status,
        order.paymentStatus,
        parseCustomerPaymentFromNotes(order.notes)?.mode
      )
    : '';
  const currentIndex = order ? JOURNEY.findIndex((j) => j.status === trackStatus) : -1;
  const isPickedUp = trackStatus === 'PICKED_UP';
  const awaitingCashier = order?.paymentStatus !== 'PAID' || order?.status === 'ON_HOLD';
  const effectiveIndex = isPickedUp ? JOURNEY.length - 1 : Math.max(0, currentIndex);

  function eta(): string | null {
    if (!order?.estimatedReadyAt || order.status === 'READY' || isPickedUp) return null;
    const diff = new Date(order.estimatedReadyAt).getTime() - Date.now();
    if (diff <= 0) return 'Segera selesai';
    const hours = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    if (hours > 24) return `± ${Math.ceil(hours / 24)} hari lagi`;
    if (hours > 0) return `± ${hours} jam ${mins} menit lagi`;
    return `± ${mins} menit lagi`;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">

      <CelebrationBurst
        show={celebrate}
        title="Cucian Siap! 🎉"
        subtitle="Yuk segera diambil"
        onDone={() => setCelebrate(false)}
      />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-navy/60 transition-colors hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="mb-8 flex flex-col items-center text-center">
          <AnimatedLogo width={220} height={120} priority />
          <h1 className="mt-4 font-display text-3xl font-extrabold text-brand-navy">
            Lacak Cucian Anda
          </h1>
          <p className="mt-1 text-brand-navy/60">
            Pantau status cucian real-time, dari mesin cuci sampai siap diambil
          </p>
        </div>

        {/* Search */}
        <div className="rainbow-border-active mb-4">
          <div className="rounded-[22px] bg-white/95 p-2 backdrop-blur-xl">
            <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-navy/30" />
                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Masukkan nomor order, mis. JKT01-20260618-0100"
                  className="h-13 w-full rounded-2xl border-0 bg-transparent py-3 pl-12 pr-4 text-brand-navy placeholder:text-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/40"
                />
              </div>
              <Button type="submit" variant="rainbow" className="h-13 px-8" disabled={loading}>
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Lacak
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setScanOpen(true)}
          disabled={loading}
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rainbow-cyan/40 bg-white/70 py-3.5 text-sm font-semibold text-brand-navy shadow-aww-sm backdrop-blur-md transition-all hover:border-rainbow-cyan hover:bg-white hover:shadow-aww-md disabled:opacity-50"
        >
          <ScanLine className="h-5 w-5 text-rainbow-cyan" />
          Scan / Foto QR Code Struk
        </button>

        <QrTrackScanner
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          onScan={handleQrScan}
          onScanFailed={handleQrFailed}
        />

        {popupError && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-aww-lg">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="font-display text-xl font-bold text-brand-navy">{popupError}</h2>
              <p className="mt-2 text-sm text-brand-navy/60">
                QR code tidak terbaca atau pesanan tidak ada di sistem. Pastikan struk AWW Laundry asli dan QR code terlihat jelas.
              </p>
              <Button variant="rainbow" className="mt-5 w-full" onClick={() => setPopupError('')}>
                Coba Lagi
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <WaterDropletMascot className="h-12 w-12" />
            <p className="text-sm text-amber-700">{error}</p>
          </div>
        )}

        {/* Empty hint */}
        {!order && !pickup && !error && (
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/60 bg-white/40 py-12 text-center backdrop-blur-md">
            <WaterDropletMascot className="h-24 w-24" wave />
            <div>
              <p className="font-semibold text-brand-navy">Masukkan nomor order / kode jemput</p>
              <p className="text-sm text-brand-navy/50">Ketik manual, atau tap &ldquo;Scan / Foto QR Code Struk&rdquo; di atas</p>
            </div>
          </div>
        )}

        {/* Pickup result */}
        {pickup && (
          <div ref={resultRef} className="space-y-6">
            <div className="track-card overflow-hidden rounded-3xl bg-white shadow-aww-lg">
              {(() => {
                const idx = Math.max(0, PICKUP_JOURNEY.findIndex((j) => j.status === pickup.status));
                const cur = PICKUP_JOURNEY[idx];
                return (
                  <>
                    <div
                      className="relative flex items-center justify-between p-6 text-white"
                      style={{ background: `linear-gradient(135deg, ${cur.color}, ${PICKUP_JOURNEY[Math.min(idx + 1, PICKUP_JOURNEY.length - 1)].color})` }}
                    >
                      <div>
                        <p className="text-sm font-medium text-white/80">Status jemput</p>
                        <p className="font-display text-2xl font-bold">{cur.label}</p>
                        <p className="mt-1 font-mono text-xs text-white/70">{pickup.trackingCode}</p>
                      </div>
                      {pickup.status === 'COMPLETED' ? <PartyPopper className="h-16 w-16" /> : <WaterDropletMascot className="h-20 w-20" />}
                    </div>

                    <div className="relative p-6">
                      <div className="absolute left-[2.45rem] top-10 bottom-10 w-0.5 bg-brand-navy/10">
                        <div className="progress-fill w-full bg-aww-rainbow" style={{ height: `${(idx / (PICKUP_JOURNEY.length - 1)) * 100}%` }} />
                      </div>
                      <div className="space-y-6">
                        {PICKUP_JOURNEY.map((stage, i) => {
                          const done = i <= idx;
                          const Icon = stage.icon;
                          return (
                            <div key={stage.status} className="journey-step relative flex items-start gap-4">
                              <div
                                className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${done ? 'shadow-aww-glow-bubble' : 'bg-brand-navy/5'}`}
                                style={done ? { backgroundColor: stage.color } : undefined}
                              >
                                <Icon className={`h-6 w-6 ${done ? 'text-white' : 'text-brand-navy/30'}`} />
                              </div>
                              <div className="pt-1">
                                <p className={`font-semibold ${done ? 'text-brand-navy' : 'text-brand-navy/40'}`}>{stage.label}</p>
                                <p className={`text-sm ${done ? 'text-brand-navy/60' : 'text-brand-navy/30'}`}>{stage.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="track-detail grid gap-3 rounded-3xl bg-white p-6 shadow-aww-sm sm:grid-cols-2">
              <Detail label="Nama" value={pickup.customerName} />
              <Detail label="Layanan" value={pickup.serviceName} />
              <Detail label="Jadwal" value={`${new Date(pickup.scheduleDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} · ${pickup.scheduleSlot}`} />
              <Detail label="Cabang" value={pickup.branch.name} />
              <Detail label="Alamat Jemput" value={pickup.address} />
              {pickup.estimatedKg != null && <Detail label="Estimasi Berat" value={`${pickup.estimatedKg} kg`} />}
            </div>
          </div>
        )}

        {/* Result */}
        {order && (
          <div ref={resultRef} className="space-y-6">
            {/* Hero status card */}
            <div className="track-card overflow-hidden rounded-3xl bg-white shadow-aww-lg">
              <div
                className="relative flex items-center justify-between p-6 text-white"
                style={{
                  background: awaitingCashier
                    ? 'linear-gradient(135deg, #FF8C2A, #FF5C9A)'
                    : `linear-gradient(135deg, ${JOURNEY[effectiveIndex]?.color ?? '#4ECDC4'}, ${JOURNEY[Math.min(effectiveIndex + 1, JOURNEY.length - 1)]?.color ?? '#4A90D9'})`,
                }}
              >
                <div>
                  <p className="text-sm font-medium text-white/80">Status saat ini</p>
                  <p className="font-display text-2xl font-bold">
                    {isPickedUp ? 'Sudah Diambil' : getCustomerLaundryStatus(trackStatus)}
                  </p>
                  {awaitingCashier && (
                    <p className="mt-1 text-xs text-white/85">Menunggu kasir konfirmasi terima cucian & pembayaran</p>
                  )}
                  <p className="mt-1 font-mono text-xs text-white/70">{order.orderNumber}</p>
                </div>
                {awaitingCashier ? (
                  <Package className="h-16 w-16 opacity-90" />
                ) : trackStatus === 'WASHING' ? (
                  <WashingMachine className="h-20 w-20" />
                ) : trackStatus === 'READY' || isPickedUp ? (
                  <PartyPopper className="h-16 w-16" />
                ) : (
                  <WaterDropletMascot className="h-20 w-20" />
                )}
              </div>

              {eta() && (
                <div className="flex items-center justify-center gap-2 bg-brand-sky/10 py-3 text-sm font-medium text-brand-navy">
                  <Clock className="h-4 w-4 text-rainbow-cyan" />
                  Estimasi: {eta()}
                </div>
              )}
            </div>

            {/* Journey timeline */}
            <div className="track-card rounded-3xl bg-white p-6 shadow-aww-md">
              <p className="mb-6 flex items-center gap-2 font-display text-lg font-bold text-brand-navy">
                <Sparkles className="h-5 w-5 text-brand-pink" /> Perjalanan Cucian
              </p>

              <div className="relative pl-2">
                {/* vertical track */}
                <div className="absolute bottom-4 left-[27px] top-4 w-1 rounded-full bg-brand-navy/10" />
                <div
                  className="progress-fill absolute left-[27px] top-4 w-1 rounded-full bg-aww-rainbow"
                  style={{
                    height: `calc(${(Math.max(effectiveIndex, 0) / (JOURNEY.length - 1)) * 100}% - 2rem)`,
                  }}
                />

                <div className="space-y-6">
                  {JOURNEY.map((step, i) => {
                    const Icon = step.icon;
                    const done = !awaitingCashier && i < effectiveIndex;
                    const active = !awaitingCashier && i === effectiveIndex;
                    return (
                      <div key={step.status} className="journey-step relative flex items-start gap-4">
                        <div
                          className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all ${
                            active ? 'scale-110 shadow-aww-md ring-4 ring-white' : ''
                          }`}
                          style={{
                            backgroundColor: done || active ? step.color : '#E5E9F0',
                          }}
                        >
                          <Icon className={`h-6 w-6 ${done || active ? 'text-white' : 'text-brand-navy/30'}`} />
                          {active && (
                            <span
                              className="absolute inset-0 animate-ping rounded-full opacity-40"
                              style={{ backgroundColor: step.color }}
                            />
                          )}
                        </div>
                        <div className={`pt-1 ${!done && !active ? 'opacity-40' : ''}`}>
                          <p className="font-semibold text-brand-navy">{step.label}</p>
                          <p className="text-sm text-brand-navy/55">{step.desc}</p>
                          {active && order.statusLogs.length > 0 && (
                            <p className="mt-1 text-xs text-brand-navy/40">
                              {new Date(
                                order.statusLogs[order.statusLogs.length - 1].createdAt
                              ).toLocaleString('id-ID')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detail cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="track-detail rounded-2xl bg-white p-5 shadow-aww-sm">
                <p className="text-xs uppercase tracking-wider text-brand-navy/40">Detail Pesanan</p>
                <div className="mt-3 space-y-2 text-sm">
                  <Row label="Pelanggan" value={order.customer.name} />
                  <Row label="Layanan" value={order.serviceType.name} />
                  <Row label="Berat" value={formatWeight(order.weightKg)} />
                  <Row label="Total" value={formatCurrency(order.total)} highlight />
                </div>
              </div>

              <div className="track-detail rounded-2xl bg-white p-5 shadow-aww-sm">
                <p className="text-xs uppercase tracking-wider text-brand-navy/40">Cabang</p>
                <div className="mt-3 space-y-3 text-sm">
                  <p className="font-semibold text-brand-navy">{order.branch.name}</p>
                  {order.branch.address && (
                    <p className="flex items-start gap-2 text-brand-navy/60">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rainbow-cyan" />
                      {order.branch.address}
                    </p>
                  )}
                  {order.branch.phone && (
                    <a
                      href={`tel:${order.branch.phone}`}
                      className="inline-flex items-center gap-2 text-rainbow-blue hover:underline"
                    >
                      <Phone className="h-4 w-4" /> {order.branch.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Barcode ID Transaksi */}
            <div className="track-detail flex flex-col items-center rounded-2xl border-2 border-dashed border-brand-navy/15 bg-white p-5">
              <p className="text-xs uppercase tracking-wider text-brand-navy/40">ID Transaksi</p>
              <div className="my-1 w-full max-w-xs overflow-hidden">
                <Barcode value={order.orderNumber} height={56} className="mx-auto block w-full" />
              </div>
              <p className="text-xs text-brand-navy/45">Tunjukkan barcode ini saat pengambilan</p>
            </div>

            {(order.canReview || order.review) && isOrderCompleted(order.status) && (
              <div className="track-detail">
                <OrderReviewForm orderId={order.id} existingReview={order.review ?? null} />
              </div>
            )}

            {(order.status === 'READY' || isPickedUp) && !isPickedUp && (
              <div className="track-detail flex items-center gap-4 rounded-2xl bg-aww-payment p-5 text-white shadow-aww-glow-rainbow">
                <PartyPopper className="h-10 w-10 shrink-0" />
                <div>
                  <p className="font-display text-lg font-bold">Cucian Anda Siap Diambil!</p>
                  <p className="text-sm text-white/80">
                    Silakan datang ke cabang dengan menunjukkan nomor order ini.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-brand-navy/40">
          AWW Laundry — FRESH • CLEAN • FUN
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-brand-navy/50">{label}</span>
      <span className={highlight ? 'font-bold text-brand-orange' : 'font-medium text-brand-navy'}>
        {value}
      </span>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-brand-navy/40">{label}</p>
      <p className="mt-0.5 font-medium text-brand-navy">{value}</p>
    </div>
  );
}
