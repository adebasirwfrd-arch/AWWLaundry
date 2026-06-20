import { formatCurrency, formatWeight, PAYMENT_METHOD_LABELS } from '@aww/shared';
import type { fetchCashflowOverview } from '@/lib/cashflow-analytics';

type CashflowData = Awaited<ReturnType<typeof fetchCashflowOverview>>;

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

/** CSV lengkap (UTF-8 BOM) — semua data cashflow periode, bisa dibuka di Excel. */
export function generateCashflowReportCsv(input: {
  periodLabel: string;
  organizationName: string;
  generatedAt: Date;
  data: CashflowData;
}): Buffer {
  const { data } = input;
  const { summary } = data;
  const lines: string[] = [];

  lines.push(
    row(['AWW Laundry — Laporan Cashflow']),
    row(['Organisasi', input.organizationName]),
    row(['Periode', input.periodLabel]),
    row(['Dibuat', input.generatedAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'])
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

  const csv = '\uFEFF' + lines.join('\n');
  return Buffer.from(csv, 'utf8');
}
