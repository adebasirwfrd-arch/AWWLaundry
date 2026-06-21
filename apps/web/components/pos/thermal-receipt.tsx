'use client';

import { QRCodeSVG } from 'qrcode.react';
import { formatCurrency, formatWeight } from '@aww/shared';
import { Barcode } from '@/components/ui/barcode';

export interface ReceiptPaymentLine {
  method: string;
  amount: number;
  label?: string;
}

export interface ReceiptData {
  orderNumber: string;
  total: number;
  weightKg: number;
  customerName: string;
  customerPhone?: string;
  serviceName: string;
  pricePerKg?: number;
  estimatedReadyAt: string;
  paid?: boolean;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID';
  payments?: ReceiptPaymentLine[];
  remainingAmount?: number;
  remainingMethod?: string;
  remainingQrisPayload?: string;
  paymentMode?: string;
  branchName: string;
  branchPhone?: string;
  trackUrl: string;
  items?: { description: string; qty: number; total: number }[];
  orderStatus?: string;
}

/**
 * Thermal receipt (80mm) — hidden on screen, only rendered when printing.
 * Monospace, centered, with QR. Matches a real ESC/POS struk layout.
 */
export function ThermalReceipt({ data }: { data: ReceiptData }) {
  const line = '--------------------------------';
  const statusLabel =
    data.orderStatus === 'ON_HOLD'
      ? data.paymentStatus === 'PARTIAL'
        ? 'DP DITERIMA · TUNGGU KONFIRMASI'
        : data.paid || data.paymentStatus === 'PAID'
          ? 'BAYAR TERCATAT · TUNGGU KONFIRMASI'
          : 'MENUNGGU KONFIRMASI KASIR'
      : data.paymentStatus === 'PARTIAL'
        ? 'DP DITERIMA'
        : data.paid
          ? `LUNAS (${data.paymentMethod ?? 'TUNAI'})`
          : 'BELUM BAYAR';

  return (
    <div className="thermal-receipt">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }}>AWW LAUNDRY</div>
        <div style={{ fontSize: 9 }}>FRESH • CLEAN • FUN</div>
        <div style={{ marginTop: 4 }}>{data.branchName}</div>
        {data.branchPhone && <div>{data.branchPhone}</div>}
      </div>

      <div style={{ margin: '6px 0' }}>{line}</div>

      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 13 }}>{data.orderNumber}</div>
      <div style={{ textAlign: 'center', fontSize: 9 }}>
        {new Date().toLocaleString('id-ID')}
      </div>
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <Barcode value={data.orderNumber} height={42} width={1.4} fontSize={11} background="#ffffff" />
      </div>

      <div style={{ margin: '6px 0' }}>{line}</div>

      <Row label="Pelanggan" value={data.customerName} />
      {data.customerPhone && <Row label="Telepon" value={data.customerPhone} />}
      <Row label="Layanan" value={data.serviceName} />
      {data.weightKg > 0 && <Row label="Berat" value={formatWeight(data.weightKg)} />}
      {data.pricePerKg ? <Row label="Harga/kg" value={formatCurrency(data.pricePerKg)} /> : null}

      {data.items && data.items.length > 0 && (
        <>
          <div style={{ margin: '6px 0' }}>{line}</div>
          {data.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span>{it.qty}x {it.description}</span>
              <span>{formatCurrency(it.total)}</span>
            </div>
          ))}
        </>
      )}

      <div style={{ margin: '6px 0' }}>{line}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: 14 }}>
        <span>TOTAL</span>
        <span>{formatCurrency(data.total)}</span>
      </div>

      {data.payments && data.payments.length > 0 ? (
        <>
          <div style={{ margin: '4px 0' }}>{line}</div>
          <div style={{ fontSize: 10, fontWeight: 'bold' }}>RINCIAN PEMBAYARAN</div>
          {data.payments.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span>{p.label ? `${p.label}: ` : ''}{p.method}</span>
              <span>{formatCurrency(p.amount)}</span>
            </div>
          ))}
          {(data.remainingAmount ?? 0) > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 2 }}>
                <span>Sisa ({data.remainingMethod ?? '—'})</span>
                <span>{formatCurrency(data.remainingAmount!)}</span>
              </div>
              <div style={{ fontSize: 9, marginTop: 2 }}>Bayar setelah cucian selesai</div>
            </>
          )}
        </>
      ) : null}

      <Row label="Status" value={statusLabel} />

      {data.estimatedReadyAt && (
        <>
          <div style={{ margin: '6px 0' }}>{line}</div>
          <div style={{ fontSize: 10 }}>
            Estimasi selesai:
            <br />
            {new Date(data.estimatedReadyAt).toLocaleString('id-ID')}
          </div>
        </>
      )}

      <div style={{ margin: '8px 0', textAlign: 'center' }}>
        <QRCodeSVG value={data.trackUrl} size={110} level="M" />
        <div style={{ fontSize: 9, marginTop: 4 }}>Scan untuk lacak status cucian</div>
      </div>

      {data.remainingQrisPayload && (data.remainingAmount ?? 0) > 0 && (
        <div style={{ margin: '8px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 'bold' }}>QRIS PELUNASAN</div>
          <div style={{ fontSize: 9 }}>{formatCurrency(data.remainingAmount!)}</div>
          <QRCodeSVG value={data.remainingQrisPayload} size={110} level="M" />
          <div style={{ fontSize: 9, marginTop: 4 }}>Scan saat pelunasan — nominal sesuai sisa</div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 9, marginTop: 6 }}>
        Terima kasih telah mempercayakan
        <br />
        cucian Anda kepada AWW Laundry!
      </div>
      <div style={{ margin: '6px 0' }}>{line}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 'bold', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
