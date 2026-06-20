import { formatCurrency, formatWeight, PAYMENT_METHOD_LABELS } from '@aww/shared';
import type { fetchCashflowOverview } from '@/lib/cashflow-analytics';

type CashflowData = Awaited<ReturnType<typeof fetchCashflowOverview>>;

const th = 'padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b';
const td = 'padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#1E3A6E';
const sectionTitle = 'font-size:15px;font-weight:700;color:#1E3A6E;margin:24px 0 10px';

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) return '<p style="color:#94a3b8;font-size:12px">Tidak ada data</p>';
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${headers.map((h) => `<th style="${th}">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${td}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

export function buildCashflowReportEmailHtml(input: {
  name: string;
  reportTitle: string;
  periodLabel: string;
  organizationName: string;
  data: CashflowData;
}): string {
  const { data } = input;
  const { summary } = data;
  const marginPct =
    summary.totalIncome > 0
      ? (((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100).toFixed(1)
      : '0';
  const capexRatio =
    summary.totalExpense > 0 ? ((summary.totalCapex / summary.totalExpense) * 100).toFixed(0) : '0';

  const kpi = (label: string, value: string, color: string) =>
    `<td style="padding:12px;background:#f8fafc;border-radius:8px;width:25%">
      <div style="font-size:11px;color:#64748b">${label}</div>
      <div style="font-size:16px;font-weight:700;color:${color};margin-top:4px">${value}</div>
    </td>`;

  return `
<div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;color:#1E3A6E">
  <div style="background:#1E3A6E;color:white;padding:20px 24px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:20px">${input.reportTitle}</h1>
    <p style="margin:6px 0 0;opacity:0.85;font-size:13px">${input.organizationName} · ${input.periodLabel}</p>
  </div>
  <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <p style="font-size:14px">Halo <strong>${input.name}</strong>, berikut rekap cashflow lengkap periode ini. Lampiran: <strong>PDF</strong> (chart & analisis) dan <strong>CSV</strong> (data mentah semua transaksi).</p>

    <table style="width:100%;border-collapse:separate;border-spacing:8px;margin:16px 0">
      <tr>
        ${kpi('Pemasukan', formatCurrency(summary.totalIncome), '#22C55E')}
        ${kpi('Pengeluaran', formatCurrency(summary.totalExpense), '#EF4444')}
        ${kpi('Net Cashflow', formatCurrency(summary.netCashflow), summary.netCashflow >= 0 ? '#4A90D9' : '#EF4444')}
        ${kpi('Order Lunas', String(summary.orderCount), '#1E3A6E')}
      </tr>
    </table>

    <p style="font-size:12px;color:#64748b;margin:0">
      CAPEX ${formatCurrency(summary.totalCapex)} · OPEX ${formatCurrency(summary.totalOpex)} ·
      Berat ${formatWeight(summary.totalWeight)} · Rata-rata order ${formatCurrency(summary.avgOrderValue)}
    </p>

    <h3 style="${sectionTitle}">Analisis</h3>
    <ul style="font-size:13px;color:#475569;line-height:1.7;padding-left:18px">
      <li>Net cashflow: <strong style="color:${summary.netCashflow >= 0 ? '#22C55E' : '#EF4444'}">${formatCurrency(summary.netCashflow)}</strong> (${summary.netCashflow >= 0 ? 'surplus' : 'defisit'})</li>
      <li>Margin operasional: <strong>${marginPct}%</strong> dari pemasukan</li>
      <li>Rasio CAPEX: <strong>${capexRatio}%</strong> dari total pengeluaran</li>
      <li>${summary.paymentCount} transaksi pemasukan · ${summary.expenseCount} pengeluaran</li>
    </ul>

    <h3 style="${sectionTitle}">Trend Harian</h3>
    ${table(
      ['Tanggal', 'Pemasukan', 'Pengeluaran', 'Net'],
      data.dailyTrend.map((d) => [
        d.date,
        formatCurrency(d.income),
        formatCurrency(d.expense),
        formatCurrency(d.net),
      ])
    )}

    <h3 style="${sectionTitle}">Pemasukan per Cabang</h3>
    ${table(
      ['Cabang', 'Nominal', 'Transaksi'],
      data.incomeByBranch.map((b) => [b.branchName, formatCurrency(b.amount), String(b.count)])
    )}

    <h3 style="${sectionTitle}">Metode Pembayaran</h3>
    ${table(
      ['Metode', 'Nominal', 'Jumlah'],
      data.paymentMethods.map((p) => [
        PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        formatCurrency(p.amount),
        String(p.count),
      ])
    )}

    <h3 style="${sectionTitle}">CAPEX vs OPEX</h3>
    ${table(
      ['Tipe', 'Nominal', 'Jumlah'],
      data.capexOpexSplit.map((s) => [s.name, formatCurrency(s.value), String(s.count)])
    )}

    <h3 style="${sectionTitle}">Pengeluaran per Kategori</h3>
    ${table(
      ['Kategori', 'Tipe', 'Nominal'],
      data.expenseDonut.map((e) => [e.name, e.type, formatCurrency(e.value)])
    )}

    <h3 style="${sectionTitle}">Semua Pemasukan (${data.incomeTable.length})</h3>
    ${table(
      ['Tanggal', 'Cabang', 'Order', 'Pelanggan', 'Layanan', 'Metode', 'Nominal'],
      data.incomeTable.map((p) => [
        new Date(p.paidAt).toLocaleDateString('id-ID'),
        p.branchName,
        p.orderNumber,
        p.customerName,
        p.serviceName,
        PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        formatCurrency(p.amount),
      ])
    )}

    <h3 style="${sectionTitle}">Semua Pengeluaran (${data.expenseTable.length})</h3>
    ${table(
      ['Tanggal', 'Cabang', 'Tipe', 'Kategori', 'Judul', 'Vendor', 'Net'],
      data.expenseTable.map((e) => [
        new Date(e.date).toLocaleDateString('id-ID'),
        e.branchName,
        e.type,
        e.category,
        e.title,
        e.vendor ?? '—',
        formatCurrency(e.netAmount),
      ])
    )}

    <p style="margin-top:24px;font-size:12px;color:#64748b">
      Data lengkap dengan semua kolom tersedia di file CSV terlampir. Chart visual ada di PDF.
    </p>
    <p style="color:#888;font-size:11px;margin-top:20px">AWW Laundry — FRESH · CLEAN · FUN</p>
  </div>
</div>`;
}
