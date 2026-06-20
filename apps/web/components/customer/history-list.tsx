'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Trash2, Package, Clock, ShoppingBag, Receipt, X, FileText, Sparkles } from 'lucide-react';
import { ORDER_STATUS_LABELS, getEffectiveCustomerOrderStatus, LOYALTY_APP_ORDER_BONUS } from '@aww/shared';
import { WaterDropletMascot } from '@/components/brand/water-droplet-mascot';
import { Button } from '@/components/ui/button';
import { ReceiptBill } from '@/components/pos/receipt-bill';
import type { ReceiptData } from '@/components/pos/thermal-receipt';
import { deleteCustomerOrder } from '@/app/actions/customer-orders';

interface HistoryOrder {
  id: string;
  orderNumber: string;
  serviceName: string;
  itemCount: number;
  total: number;
  status: string;
  paid: boolean;
  paymentMethod?: string;
  weightKg: number;
  branchName: string;
  branchPhone?: string;
  estimatedReadyAt: string;
  createdAt: string;
  fromApp: boolean;
  items: { description: string; qty: number; total: number }[];
}

const STATUS_COLOR: Record<string, string> = {
  ON_HOLD: 'bg-amber-100 text-amber-600',
  RECEIVED: 'bg-rainbow-cyan/15 text-rainbow-cyan',
  WASHING: 'bg-rainbow-blue/15 text-rainbow-blue',
  DRYING: 'bg-rainbow-purple/15 text-rainbow-purple',
  IRONING: 'bg-brand-orange/15 text-brand-orange',
  FOLDING: 'bg-rainbow-yellow/20 text-amber-600',
  READY: 'bg-rainbow-green/15 text-rainbow-green',
  PICKED_UP: 'bg-rainbow-green/15 text-rainbow-green',
  DELIVERED: 'bg-rainbow-green/15 text-rainbow-green',
  CANCELLED: 'bg-red-100 text-red-500',
};

function statusLabel(status: string, paid: boolean) {
  const effective = getEffectiveCustomerOrderStatus(status, paid ? 'PAID' : 'UNPAID');
  if (effective === 'ON_HOLD') return 'Menunggu Konfirmasi Kasir';
  return ORDER_STATUS_LABELS[effective as keyof typeof ORDER_STATUS_LABELS] ?? effective;
}

function rupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

export function HistoryList({
  orders,
  customerName,
  customerPhone,
}: {
  orders: HistoryOrder[];
  customerName: string;
  customerPhone?: string;
}) {
  const [list, setList] = useState(orders);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCustomerOrder(id);
        setList((prev) => prev.filter((o) => o.id !== id));
        setConfirmId(null);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Gagal membatalkan');
        setConfirmId(null);
      }
    });
  }

  function openReceipt(o: HistoryOrder) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setReceipt({
      orderNumber: o.orderNumber,
      total: o.total,
      weightKg: o.weightKg,
      customerName,
      customerPhone,
      serviceName: o.serviceName,
      estimatedReadyAt: o.estimatedReadyAt,
      paid: o.paid,
      paymentMethod: o.paymentMethod,
      orderStatus: o.status,
      branchName: o.branchName,
      branchPhone: o.branchPhone,
      trackUrl: `${origin}/track?order=${o.orderNumber}`,
      items: o.items,
    });
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-brand-navy/10 bg-white py-16 text-center shadow-aww-sm">
        <WaterDropletMascot className="h-24 w-24" wave />
        <div>
          <p className="font-semibold text-brand-navy">Belum ada pesanan</p>
          <p className="text-sm text-brand-navy/50">Yuk mulai cuci, pilih layanan di beranda!</p>
        </div>
        <Link href="/customer">
          <Button variant="rainbow"><ShoppingBag className="h-4 w-4" /> Mulai Pesan</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((o) => (
        <div key={o.id} className="rounded-3xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-brand-navy">{o.serviceName}</p>
                <p className="font-mono text-[11px] text-brand-navy/45">{o.orderNumber}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLOR[getEffectiveCustomerOrderStatus(o.status, o.paid ? 'PAID' : 'UNPAID')] ?? 'bg-brand-navy/10 text-brand-navy'}`}>
              {statusLabel(o.status, o.paid)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-brand-navy/5 pt-3">
            <div className="flex items-center gap-4 text-xs text-brand-navy/55">
              <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {o.itemCount} item</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <p className="font-display text-base font-bold text-brand-orange">{rupiah(o.total)}</p>
          </div>

          {o.fromApp && o.status === 'ON_HOLD' && !o.paid && (
            <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-brand-sky/10 px-3 py-2 text-[11px] text-brand-navy/60">
              <Sparkles className="h-3.5 w-3.5 text-rainbow-yellow" />
              +{LOYALTY_APP_ORDER_BONUS} poin menunggu konfirmasi kasir
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/customer/orders/${o.orderNumber}`}
              className="flex items-center gap-1 rounded-xl border border-brand-navy/15 px-3 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-navy/5"
            >
              <FileText className="h-4 w-4" /> Detail
            </Link>
            <button
              onClick={() => openReceipt(o)}
              className="flex items-center gap-1 rounded-xl border border-brand-navy/15 px-3 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-navy/5"
            >
              <Receipt className="h-4 w-4" /> Struk
            </button>
            <Link href={`/track?order=${o.orderNumber}`} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">Lacak</Button>
            </Link>
            {o.status === 'ON_HOLD' && (
              confirmId === o.id ? (
                <div className="flex flex-1 gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmId(null)} disabled={pending}>Batal</Button>
                  <button
                    onClick={() => handleDelete(o.id)}
                    disabled={pending}
                    className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {pending ? '...' : 'Hapus'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(o.id)}
                  className="flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> Batalkan
                </button>
              )
            )}
          </div>
        </div>
      ))}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-navy/40 p-4 backdrop-blur-sm print:bg-white print:p-0">
          <div className="my-auto w-full max-w-sm">
            <div className="mb-2 flex justify-end print:hidden">
              <button
                onClick={() => setReceipt(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-navy shadow-aww-sm"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ReceiptBill data={receipt} onClose={() => setReceipt(null)} variant="download" />
          </div>
        </div>
      )}
    </div>
  );
}
