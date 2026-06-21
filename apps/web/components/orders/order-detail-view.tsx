'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatWeight, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, getCustomerLaundryStatus, computeRemainingBalance, type TransferBankDetails } from '@aww/shared';
import { Package, User, Scale, CreditCard, Clock, Building2, Smartphone, ImageIcon } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentProofSection } from '@/components/orders/payment-proof-section';
import { RemainingPaymentForm } from '@/components/pos/remaining-payment-form';
import { buildOrderNotesDisplay } from '@/lib/order-notes-display';

const PROOF_METHODS = new Set(['QRIS', 'BANK_TRANSFER']);

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  weightKg: number;
  total: number;
  subtotal: number;
  discount?: number;
  fromApp?: boolean;
  notes?: string | null;
  estimatedReadyAt: string | null;
  readyAt?: string | null;
  pickedUpAt?: string | null;
  createdAt: string;
  customer: { name: string; phone: string; email?: string | null };
  serviceName: string;
  branchName: string;
  branchCode?: string;
  branchPhone?: string | null;
  bankDetails?: TransferBankDetails;
  createdBy?: string;
  items: { description: string; qty: number; unitPrice: number; total: number }[];
  payments: { method: string; amount: number; paidAt: string; proofUrl?: string | null; receivedBy?: string }[];
  statusLogs: { toStatus: string; note: string | null; createdAt: string; changedBy: string }[];
}

export function OrderDetailView({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const paid = order.paymentStatus === 'PAID';
  const partial = order.paymentStatus === 'PARTIAL';
  const paidAmount = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = computeRemainingBalance(order.total, paidAmount);
  const hasProof = order.payments.some((p) => p.proofUrl && PROOF_METHODS.has(p.method));
  const missingProof = order.payments.some((p) => PROOF_METHODS.has(p.method) && !p.proofUrl);

  const displayNote = useMemo(
    () =>
      buildOrderNotesDisplay({
        notes: order.notes,
        fromApp: order.fromApp ?? false,
        paymentStatus: order.paymentStatus,
        total: order.total,
        payments: order.payments.map((p) => ({ method: p.method, amount: p.amount })),
      }),
    [order.notes, order.fromApp, order.paymentStatus, order.total, order.payments]
  );

  const paymentBadgeClass = paid
    ? 'bg-rainbow-green/15 text-rainbow-green'
    : partial
      ? 'bg-amber-100 text-amber-700'
      : 'bg-amber-100 text-amber-600';

  const paymentBadgeLabel = paid
    ? 'Sudah Bayar'
    : partial
      ? PAYMENT_STATUS_LABELS.PARTIAL
      : 'Belum Bayar';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-navy">Detail Pesanan</h1>
          <p className="font-mono text-sm text-brand-navy/50">{order.orderNumber}</p>
          <p className="mt-1 text-xs text-brand-navy/45">
            Dibuat {new Date(order.createdAt).toLocaleString('id-ID')}
            {order.createdBy && ` · oleh ${order.createdBy}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.fromApp && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rainbow-purple/15 px-3 py-1 text-xs font-semibold text-rainbow-purple">
              <Smartphone className="h-3.5 w-3.5" /> Via Aplikasi
            </span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentBadgeClass}`}>
            {paymentBadgeLabel}
          </span>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={User} label="Pelanggan" value={order.customer.name} sub={order.customer.phone} />
        <Stat icon={Building2} label="Cabang" value={order.branchName} sub={order.branchPhone ?? order.branchCode} />
        <Stat icon={Package} label="Layanan" value={order.serviceName} />
        <Stat icon={Scale} label="Berat" value={order.weightKg > 0 ? formatWeight(order.weightKg) : '—'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-brand-navy/10 bg-white/80 p-5 shadow-aww-sm">
          <h2 className="mb-3 font-display font-bold text-brand-navy">Rincian Item</h2>
          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-brand-navy/75">{it.qty}× {it.description}</span>
                <span className="font-medium text-brand-navy">{formatCurrency(it.total)}</span>
              </div>
            ))}
          </div>
          {(order.discount ?? 0) > 0 && (
            <div className="mt-2 flex justify-between text-sm text-rainbow-green">
              <span>Diskon redeem poin</span>
              <span>−{formatCurrency(order.discount!)}</span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-brand-navy/10 pt-3 font-bold">
            <span>Total</span>
            <span className="text-brand-orange">{formatCurrency(order.total)}</span>
          </div>
          <div className="mt-3 rounded-xl bg-brand-sky/10 px-3 py-2 text-xs text-brand-navy/70">
            <span className="font-semibold text-brand-navy/80">Catatan: </span>
            {displayNote || '—'}
          </div>
        </section>

        <section className="rounded-3xl border border-brand-navy/10 bg-white/80 p-5 shadow-aww-sm">
          <h2 className="mb-3 flex items-center gap-2 font-display font-bold text-brand-navy">
            <CreditCard className="h-4 w-4" /> Pembayaran
          </h2>
          {order.payments.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-brand-navy/50">Belum ada pembayaran</p>
              {order.status === 'ON_HOLD' && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Jika bayar Transfer/QRIS, kasir akan memfoto bukti transaksi saat konfirmasi — foto akan muncul di sini.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {order.payments.map((p, i) => (
                <div key={i} className="rounded-xl border border-brand-navy/10 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-navy">
                      {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                    </span>
                    <span className="font-bold text-brand-orange">{formatCurrency(p.amount)}</span>
                  </div>
                  <p className="mt-1 text-xs text-brand-navy/45">
                    {new Date(p.paidAt).toLocaleString('id-ID')}
                    {p.receivedBy && ` · diterima ${p.receivedBy}`}
                  </p>
                  {PROOF_METHODS.has(p.method) && p.proofUrl && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rainbow-green">
                      <ImageIcon className="h-3.5 w-3.5" /> Bukti transaksi tersedia
                    </p>
                  )}
                  {PROOF_METHODS.has(p.method) && !p.proofUrl && (
                    <p className="mt-2 text-xs text-amber-600">Bukti transaksi belum diunggah</p>
                  )}
                </div>
              ))}
              {missingProof && (
                <p className="text-xs text-brand-navy/45">
                  Upload bukti via menu Kasir saat konfirmasi pembayaran Transfer/QRIS.
                </p>
              )}
              {partial && remaining > 0 && (
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <span className="text-brand-navy/60">Sisa tagihan: </span>
                  <span className="font-bold text-brand-orange">{formatCurrency(remaining)}</span>
                </div>
              )}
            </div>
          )}

          {partial && remaining > 0 && (
            <RemainingPaymentForm
              orderId={order.id}
              orderNumber={order.orderNumber}
              total={order.total}
              paidAmount={paidAmount}
              bankDetails={order.bankDetails}
              onPaid={() => router.refresh()}
            />
          )}
        </section>
      </div>

      {hasProof && <PaymentProofSection payments={order.payments} />}

      <section className="rounded-3xl border border-brand-navy/10 bg-white/80 p-5 shadow-aww-sm">
        <h2 className="mb-3 font-display font-bold text-brand-navy">Riwayat Status</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {order.statusLogs.map((log, i) => (
            <div key={i} className="flex gap-3 rounded-xl bg-brand-sky/5 p-3 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-rainbow-cyan" />
              <div>
                <p className="font-medium text-brand-navy">
                  {ORDER_STATUS_LABELS[log.toStatus] ?? getCustomerLaundryStatus(log.toStatus)}
                </p>
                {log.note && <p className="text-xs text-brand-navy/50">{log.note}</p>}
                <p className="text-[10px] text-brand-navy/35">
                  {new Date(log.createdAt).toLocaleString('id-ID')} · {log.changedBy}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-brand-navy/55">
          {order.estimatedReadyAt && (
            <span className="rounded-xl bg-brand-sky/10 px-3 py-2">
              Estimasi selesai: {new Date(order.estimatedReadyAt).toLocaleString('id-ID')}
            </span>
          )}
          {order.readyAt && (
            <span className="rounded-xl bg-rainbow-green/10 px-3 py-2 text-rainbow-green">
              Siap: {new Date(order.readyAt).toLocaleString('id-ID')}
            </span>
          )}
          {order.pickedUpAt && (
            <span className="rounded-xl bg-rainbow-blue/10 px-3 py-2">
              Diambil: {new Date(order.pickedUpAt).toLocaleString('id-ID')}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string | null }) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white/80 p-4 shadow-aww-sm">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-sky/10 text-rainbow-cyan">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs text-brand-navy/45">{label}</p>
      <p className="font-semibold text-brand-navy">{value}</p>
      {sub && <p className="text-xs text-brand-navy/50">{sub}</p>}
    </div>
  );
}
