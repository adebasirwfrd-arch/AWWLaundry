import { formatCurrency, formatWeight, PAYMENT_METHOD_LABELS } from '@aww/shared';
import type { OperationalReportData } from '@/lib/operational-report-data';

type ReportData = OperationalReportData;

function esc(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells: Array<string | number | null | undefined>): string {
  return cells.map(esc).join(',');
}

function section(title: string, lines: string[]): string[] {
  return [`\n# ${title}`, ...lines];
}

/** CSV lengkap (UTF-8 BOM) — cashflow, order, dan stok periode. */
export function generateCashflowReportCsv(input: {
  periodLabel: string;
  organizationName: string;
  generatedAt: Date;
  data: ReportData;
}): Buffer {
  const { data } = input;
  const { summary } = data;
  const lines: string[] = [];

  lines.push(
    row(['AWW Laundry — Laporan Operasional']),
    row(['Organisasi', input.organizationName]),
    row(['Periode', input.periodLabel]),
    row(['Dibuat', input.generatedAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB']),
    row(['Isi', 'Cashflow · Order · Stok'])
  );

  lines.push(...section('RINGKASAN', [
    row(['Metrik', 'Nilai']),
    row(['Pemasukan', summary.totalIncome]),
    row(['Pengeluaran', summary.totalExpense]),
    row(['Net Cashflow', summary.netCashflow]),
    row(['CAPEX', summary.totalCapex]),
    row(['OPEX', summary.totalOpex]),
    row(['Jumlah Order Lunas', summary.orderCount]),
    row(['Total Berat (kg)', summary.totalWeight]),
    row(['Jumlah Transaksi Bayar', summary.paymentCount]),
    row(['Jumlah Pengeluaran', summary.expenseCount]),
    row(['Rata-rata Nilai Order', summary.avgOrderValue]),
  ]));

  const marginPct =
    summary.totalIncome > 0
      ? (((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100).toFixed(2)
      : '0';
  lines.push(...section('ANALISIS', [
    row(['Margin Operasional (%)', marginPct]),
    row([
      'Rasio CAPEX terhadap Pengeluaran (%)',
      summary.totalExpense > 0 ? ((summary.totalCapex / summary.totalExpense) * 100).toFixed(2) : '0',
    ]),
  ]));

  lines.push(...section('TREND HARIAN', [
    row(['Tanggal', 'Pemasukan', 'Pengeluaran', 'Net']),
    ...data.dailyTrend.map((d) => row([d.date, d.income, d.expense, d.net])),
  ]));

  lines.push(...section('PEMASUKAN PER CABANG', [
    row(['Cabang', 'Nominal', 'Jumlah Transaksi']),
    ...data.incomeByBranch.map((b) => row([b.branchName, b.amount, b.count])),
  ]));

  lines.push(...section('METODE PEMBAYARAN', [
    row(['Metode', 'Nominal', 'Jumlah']),
    ...data.paymentMethods.map((p) => row([PAYMENT_METHOD_LABELS[p.method] ?? p.method, p.amount, p.count])),
  ]));

  lines.push(...section('CAPEX VS OPEX', [
    row(['Tipe', 'Nominal', 'Jumlah']),
    ...data.capexOpexSplit.map((s) => row([s.name, s.value, s.count])),
  ]));

  lines.push(...section('PENGELUARAN PER KATEGORI', [
    row(['Kategori', 'Tipe', 'Nominal', 'Jumlah']),
    ...data.expenseDonut.map((e) => row([e.category, e.type, e.value, e.count])),
  ]));

  if (data.heatmap.length > 0) {
    const branchNames = data.heatmap[0]?.cells.map((c) => c.branchName) ?? [];
    lines.push(...section('HEATMAP PEMASUKAN (per cabang per hari)', [
      row(['Tanggal', ...branchNames]),
      ...data.heatmap.map((h) =>
        row([h.date, ...h.cells.map((c) => c.amount)])
      ),
    ]));
  }

  lines.push(...section('SEMUA PEMASUKAN', [
    row([
      'Tanggal Bayar',
      'Cabang',
      'No Order',
      'Pelanggan',
      'Layanan',
      'Berat (kg)',
      'Metode',
      'Nominal',
      'Diterima Oleh',
      'ID Pembayaran',
    ]),
    ...data.incomeTable.map((p) =>
      row([
        new Date(p.paidAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        p.branchName,
        p.orderNumber,
        p.customerName,
        p.serviceName,
        p.weightKg,
        PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        p.amount,
        p.receivedBy,
        p.id,
      ])
    ),
  ]));

  lines.push(...section('SEMUA PENGELUARAN', [
    row([
      'Tanggal',
      'Due Date',
      'Cabang',
      'Tipe',
      'Kategori',
      'Judul',
      'Vendor',
      'Metode Bayar',
      'Harga',
      'Diskon',
      'Net',
      'Catatan',
      'Bukti Bayar URL',
      'Dicatat Oleh',
      'ID',
    ]),
    ...data.expenseTable.map((e) =>
      row([
        new Date(e.date).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }),
        e.dueDate ? new Date(e.dueDate).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }) : '',
        e.branchName,
        e.type,
        e.category,
        e.title,
        e.vendor ?? '',
        e.paymentMethod ? (PAYMENT_METHOD_LABELS[e.paymentMethod] ?? e.paymentMethod) : '',
        e.amount,
        e.discount,
        e.netAmount,
        e.description ?? '',
        e.proofUrl ?? '',
        e.createdBy,
        e.id,
      ])
    ),
  ]));

  lines.push(...section('RINGKASAN ORDER', [
    row(['Metrik', 'Nilai']),
    row(['Total Order', data.orders.summary.total]),
    row(['Order Lunas', data.orders.summary.paidCount]),
    row(['Belum Lunas', data.orders.summary.unpaidCount]),
    row(['Total Nilai Order Lunas', data.orders.summary.totalRevenue]),
    ...data.orders.summary.byStatus.map((s) => row([`Status: ${s.label}`, s.count])),
  ]));

  lines.push(...section('SEMUA ORDER', [
    row([
      'Tanggal',
      'Cabang',
      'No Order',
      'Pelanggan',
      'Telepon',
      'Layanan',
      'Berat (kg)',
      'Subtotal',
      'Diskon',
      'Total',
      'Status',
      'Pembayaran',
      'Metode Bayar',
      'Tanggal Bayar',
      'Dari App',
      'ID Order',
    ]),
    ...data.orders.orders.map((o) =>
      row([
        new Date(o.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        o.branchName,
        o.orderNumber,
        o.customerName,
        o.customerPhone,
        o.serviceName,
        o.weightKg,
        o.subtotal,
        o.discount,
        o.total,
        o.statusLabel,
        o.paymentStatusLabel,
        o.paymentMethodLabel ?? '',
        o.paidAt ? new Date(o.paidAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '',
        o.fromApp ? 'Ya' : 'Tidak',
        o.id,
      ])
    ),
  ]));

  lines.push(...section('RINGKASAN STOK', [
    row(['Metrik', 'Nilai']),
    row(['Jumlah Item Inventori', data.stock.summary.itemCount]),
    row(['Item Stok Menipis', data.stock.summary.lowStockCount]),
    row(['Pergerakan Stok (periode)', data.stock.summary.movementCount]),
    row(['Stock Opname (periode)', data.stock.summary.opnameCount]),
  ]));

  lines.push(...section('SNAPSHOT INVENTORI', [
    row([
      'Cabang',
      'SKU',
      'Nama Item',
      'Kategori',
      'Satuan',
      'Stok',
      'Min Stok',
      'Harga Satuan',
      'Nilai Stok',
      'Status',
      'Terakhir Dihitung',
      'ID Item',
    ]),
    ...data.stock.inventory.map((i) =>
      row([
        i.branchName,
        i.sku ?? '',
        i.name,
        i.category,
        i.unit,
        i.currentStock,
        i.minStock,
        i.unitCost,
        i.stockValue,
        i.isLow ? 'MENIPIS' : 'OK',
        i.lastCountedAt
          ? new Date(i.lastCountedAt).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })
          : '',
        i.id,
      ])
    ),
  ]));

  lines.push(...section('PERGERAKAN STOK', [
    row(['Tanggal', 'Cabang', 'Item', 'SKU', 'Satuan', 'Tipe', 'Qty', 'Referensi', 'ID']),
    ...data.stock.movements.map((m) =>
      row([
        new Date(m.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        m.branchName,
        m.itemName,
        m.sku ?? '',
        m.unit,
        m.type,
        m.qty,
        m.reference ?? '',
        m.id,
      ])
    ),
  ]));

  lines.push(...section('STOCK OPNAME', [
    row([
      'Cabang',
      'Periode',
      'Status',
      'Dibuat',
      'Disetujui',
      'Kas Ekspektasi',
      'Kas Aktual',
      'Selisih Kas',
      'Jumlah Baris',
      'Total Selisih Qty',
      'Total Selisih Nilai',
      'Catatan',
      'ID',
    ]),
    ...data.stock.opnames.map((o) =>
      row([
        o.branchName,
        new Date(o.period).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' }),
        o.status,
        new Date(o.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        o.approvedAt
          ? new Date(o.approvedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
          : '',
        o.cashExpected ?? '',
        o.cashActual ?? '',
        o.cashVariance ?? '',
        o.lineCount,
        o.totalVarianceQty,
        o.totalVarianceCost,
        o.notes ?? '',
        o.id,
      ])
    ),
  ]));

  for (const o of data.stock.opnames) {
    if (o.lines.length === 0) continue;
    lines.push(
      ...section(`DETAIL OPNAME — ${o.branchName} (${o.status})`, [
        row(['Item', 'Satuan', 'Stok Sistem', 'Stok Fisik', 'Selisih', 'Selisih Nilai']),
        ...o.lines.map((l) =>
          row([l.itemName, l.unit, l.systemQty, l.physicalQty, l.variance, l.varianceCost])
        ),
      ])
    );
  }

  const csv = '\uFEFF' + lines.join('\n');
  return Buffer.from(csv, 'utf8');
}
