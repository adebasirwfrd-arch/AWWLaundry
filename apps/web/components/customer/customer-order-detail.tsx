import Link from 'next/link';
import {
  Package,
  Shirt,
  Wind,
  Flame,
  Layers,
  CheckCircle2,
  MapPin,
  Phone,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency, formatWeight, getCustomerLaundryStatus } from '@aww/shared';
import { Barcode } from '@/components/ui/barcode';
import { OrderReviewForm } from '@/components/customer/order-review-form';
import { isOrderCompleted, ORDER_JOURNEY, JOURNEY_COLORS } from '@/lib/order-journey';
import { getEffectiveCustomerOrderStatus } from '@aww/shared';

const ICONS = {
  RECEIVED: Package,
  WASHING: Shirt,
  DRYING: Wind,
  IRONING: Flame,
  FOLDING: Layers,
  READY: CheckCircle2,
} as const;

export interface CustomerOrderDetailData {
  id: string;
  orderNumber: string;
  status: string;
  weightKg: number;
  total: number;
  estimatedReadyAt: string | null;
  customerName: string;
  serviceName: string;
  branch: { name: string; address: string | null; phone: string | null };
  statusLogs: Array<{ toStatus: string; createdAt: string; note: string | null }>;
  review: { rating: number; note: string | null; createdAt: string } | null;
  paid: boolean;
}

export function CustomerOrderDetail({ order }: { order: CustomerOrderDetailData }) {
  const displayStatus = getEffectiveCustomerOrderStatus(order.status, order.paid ? 'PAID' : 'UNPAID');
  const awaitingCashier = !order.paid || order.status === 'ON_HOLD';
  const currentIndex = ORDER_JOURNEY.findIndex((j) => j.status === displayStatus);
  const isPickedUp = displayStatus === 'PICKED_UP' || displayStatus === 'DELIVERED';
  const effectiveIndex = awaitingCashier ? -1 : isPickedUp ? ORDER_JOURNEY.length - 1 : currentIndex;
  const completed = isOrderCompleted(order.status) && order.paid;

  return (
    <div className="space-y-5 pb-6">
      <Link
        href="/customer/history"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-navy/60 hover:text-brand-navy"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat
      </Link>

      <div>
        <h1 className="font-display text-2xl font-extrabold text-brand-navy">Detail Transaksi</h1>
        <p className="font-mono text-sm text-brand-navy/45">{order.orderNumber}</p>
      </div>

      {/* Status timeline */}
      <div className="rounded-2xl bg-white p-5 shadow-aww-sm">
        {awaitingCashier ? (
          <div className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold">{getCustomerLaundryStatus('ON_HOLD')}</p>
            <p className="mt-1 text-amber-700/80">Kasir akan konfirmasi setelah cucian diterima dan pembayaran selesai.</p>
          </div>
        ) : (
          <p className="mb-4 text-sm font-semibold text-brand-navy">{getCustomerLaundryStatus(displayStatus)}</p>
        )}
        <div className="relative">
          <div className="absolute bottom-4 left-6 top-4 w-0.5 bg-brand-navy/10" />
          <div className="space-y-6">
            {ORDER_JOURNEY.map((step, i) => {
              const Icon = ICONS[step.status as keyof typeof ICONS];
              const done = !awaitingCashier && i < effectiveIndex;
              const active = !awaitingCashier && i === effectiveIndex;
              const color = JOURNEY_COLORS[step.status] ?? '#E5E9F0';
              return (
                <div key={step.status} className="relative flex items-start gap-4">
                  <div
                    className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${active ? 'ring-4 ring-white shadow-aww-md' : ''}`}
                    style={{ backgroundColor: done || active ? color : '#E5E9F0' }}
                  >
                    <Icon className={`h-6 w-6 ${done || active ? 'text-white' : 'text-brand-navy/30'}`} />
                  </div>
                  <div className={`pt-1 ${!done && !active ? 'opacity-40' : ''}`}>
                    <p className="font-semibold text-brand-navy">{step.label}</p>
                    <p className="text-sm text-brand-navy/55">{step.desc}</p>
                    {active && order.statusLogs.length > 0 && (
                      <p className="mt-1 text-xs text-brand-navy/40">
                        {new Date(order.statusLogs[order.statusLogs.length - 1].createdAt).toLocaleString('id-ID')}
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
        <div className="rounded-2xl bg-white p-5 shadow-aww-sm">
          <p className="text-xs uppercase tracking-wider text-brand-navy/40">Detail Pesanan</p>
          <div className="mt-3 space-y-2 text-sm">
            <DetailRow label="Pelanggan" value={order.customerName} />
            <DetailRow label="Layanan" value={order.serviceName} />
            <DetailRow label="Berat" value={formatWeight(order.weightKg)} />
            <DetailRow label="Total" value={formatCurrency(order.total)} highlight />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-aww-sm">
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
              <a href={`tel:${order.branch.phone}`} className="inline-flex items-center gap-2 text-rainbow-blue hover:underline">
                <Phone className="h-4 w-4" /> {order.branch.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Barcode */}
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-brand-navy/15 bg-white p-5">
        <p className="text-xs uppercase tracking-wider text-brand-navy/40">ID Transaksi</p>
        <div className="my-1 w-full max-w-xs overflow-hidden">
          <Barcode value={order.orderNumber} height={56} className="mx-auto block w-full" />
        </div>
        <p className="text-xs text-brand-navy/45">Tunjukkan barcode ini saat pengambilan</p>
      </div>

      {completed && (
        <OrderReviewForm
          orderId={order.id}
          existingReview={order.review}
        />
      )}

      <p className="text-center text-xs text-brand-navy/40">AWW Laundry — FRESH • CLEAN • FUN</p>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-brand-navy/50">{label}</span>
      <span className={highlight ? 'font-bold text-brand-orange' : 'font-medium text-brand-navy'}>{value}</span>
    </div>
  );
}
