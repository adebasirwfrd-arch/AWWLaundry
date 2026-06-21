'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Download, X, Loader2 } from 'lucide-react';
import { formatCurrency, getCustomerLaundryStatus, getEffectiveCustomerOrderStatus } from '@aww/shared';
import { Barcode } from '@/components/ui/barcode';
import { Button } from '@/components/ui/button';
import { ThermalReceipt, type ReceiptData } from '@/components/pos/thermal-receipt';
import { downloadReceiptPdf } from '@/lib/download-receipt-pdf';
import { getReceiptPaymentStatusLabel } from '@/lib/receipt-payment';

/**
 * On-screen styled bill/receipt with a CODE128 barcode of the transaction ID
 * and a QR for tracking.
 */
export function ReceiptBill({
  data,
  onClose,
  variant = 'print',
}: {
  data: ReceiptData;
  onClose?: () => void;
  /** `download` — save PDF (customer). `print` — browser print dialog (kasir). */
  variant?: 'print' | 'download';
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const paymentStatus = getReceiptPaymentStatusLabel(data);
  const statusToneClass =
    paymentStatus.tone === 'paid'
      ? 'text-rainbow-green'
      : paymentStatus.tone === 'partial'
        ? 'text-amber-700'
        : 'text-amber-500';
  const effectivePaymentStatus =
    data.paymentStatus ?? (data.paid ? 'PAID' : 'UNPAID');

  async function handleDownload() {
    if (!contentRef.current || downloading) return;
    setDownloading(true);
    try {
      await downloadReceiptPdf(contentRef.current, `struk-${data.orderNumber}.pdf`);
    } catch {
      alert('Gagal mengunduh struk. Coba lagi.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="receipt-bill mx-auto w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-aww-lg">
        <div ref={contentRef}>
          <div className="bg-aww-header px-6 py-5 text-center text-white">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <Image src="/brand/logo.png" alt="AWW" width={40} height={40} className="h-9 w-9 object-contain" />
            </div>
            <p className="font-display text-lg font-extrabold">AWW LAUNDRY</p>
            <p className="text-[10px] tracking-[0.25em] text-white/70">FRESH • CLEAN • FUN</p>
            <p className="mt-1 text-xs text-white/80">{data.branchName}</p>
            {data.branchPhone && <p className="text-xs text-white/70">{data.branchPhone}</p>}
          </div>

          <div className="px-6 py-5">
            <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-brand-navy/15 bg-brand-sky/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-brand-navy/40">ID Transaksi</p>
              <div className="my-1 w-full overflow-hidden">
                <Barcode value={data.orderNumber} height={56} className="mx-auto block w-full" />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Tanggal" value={new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} />
              <Row label="Pelanggan" value={data.customerName} />
              {data.customerPhone && <Row label="Telepon" value={data.customerPhone} />}
              <Row label="Layanan" value={data.serviceName} />
            </div>

            {data.items && data.items.length > 0 && (
              <div className="mt-4 space-y-1.5 border-t border-dashed border-brand-navy/10 pt-3 text-sm">
                {data.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-brand-navy/75">
                    <span>{it.qty}× {it.description}</span>
                    <span>{formatCurrency(it.total)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-brand-navy/10 pt-3">
              <span className="font-display text-base font-bold text-brand-navy">TOTAL</span>
              <span className="font-display text-xl font-extrabold text-brand-orange">{formatCurrency(data.total)}</span>
            </div>

            {data.payments && data.payments.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-dashed border-brand-navy/10 pt-3 text-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-navy/40">
                  Rincian Pembayaran
                </p>
                {data.payments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-brand-navy/75">
                    <span>{p.label ? `${p.label}: ` : ''}{p.method}</span>
                    <span className="font-semibold">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
                {(data.remainingAmount ?? 0) > 0 && (
                  <>
                    <div className="flex items-center justify-between font-semibold text-amber-700">
                      <span>Sisa ({data.remainingMethod ?? '—'})</span>
                      <span>{formatCurrency(data.remainingAmount!)}</span>
                    </div>
                    <p className="text-xs text-brand-navy/55">Bayar setelah cucian selesai</p>
                  </>
                )}
              </div>
            )}

            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-brand-navy/50">Status Bayar</span>
              <span className={`font-semibold ${statusToneClass}`}>{paymentStatus.label}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-brand-navy/50">Status Cucian</span>
              <span className="max-w-[55%] text-right font-semibold text-brand-navy">
                {getCustomerLaundryStatus(
                  getEffectiveCustomerOrderStatus(
                    data.orderStatus ?? (data.paid ? 'RECEIVED' : 'ON_HOLD'),
                    effectivePaymentStatus,
                    data.paymentMode
                  )
                )}
              </span>
            </div>

            {data.estimatedReadyAt && (
              <p className="mt-3 rounded-xl bg-brand-sky/10 px-3 py-2 text-center text-xs text-brand-navy/60">
                Estimasi selesai: {new Date(data.estimatedReadyAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}

            <div className="mt-4 flex flex-col items-center border-t border-dashed border-brand-navy/10 pt-4">
              <QRCodeSVG value={data.trackUrl} size={96} level="M" />
              <p className="mt-2 text-center text-[11px] text-brand-navy/50">Scan untuk lacak status cucian</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 border-t border-brand-navy/10 p-4 print:hidden">
          {onClose && (
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4" /> Tutup
            </Button>
          )}
          {variant === 'download' ? (
            <Button variant="primary" className="flex-1" onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? 'Mengunduh...' : 'Download'}
            </Button>
          ) : (
            <Button variant="primary" className="flex-1" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print Struk
            </Button>
          )}
        </div>
      </div>

      {variant === 'print' && <ThermalReceipt data={data} />}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-brand-navy/50">{label}</span>
      <span className="text-right font-medium text-brand-navy">{value}</span>
    </div>
  );
}
