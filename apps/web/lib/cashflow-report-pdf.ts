import { jsPDF } from 'jspdf';
import { formatCurrency, formatWeight, PAYMENT_METHOD_LABELS } from '@aww/shared';
import type { OperationalReportData } from '@/lib/operational-report-data';
import type { CashflowReportKind } from '@/lib/report-periods';
import { REPORT_KIND_LABELS } from '@/lib/report-periods';

type ReportData = OperationalReportData;

const NAVY: [number, number, number] = [30, 58, 110];
const GREEN: [number, number, number] = [34, 197, 94];
const RED: [number, number, number] = [239, 68, 68];
const CYAN: [number, number, number] = [74, 144, 217];
const ORANGE: [number, number, number] = [255, 140, 42];
const MUTED: [number, number, number] = [100, 116, 139];

const MARGIN = 14;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function generateCashflowReportPdf(input: {
  kind: CashflowReportKind;
  periodLabel: string;
  organizationName: string;
  generatedAt: Date;
  data: ReportData;
}): Buffer {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = MARGIN;

  const addPageIfNeeded = (need: number) => {
    if (y + need > 285) {
      pdf.addPage();
      y = MARGIN;
    }
  };

  // ── Header ──
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, PAGE_W, 32, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.text('AWW Laundry — Laporan Operasional', MARGIN, 14);
  pdf.setFontSize(10);
  pdf.text(`${REPORT_KIND_LABELS[input.kind]} · Cashflow · Order · Stok`, MARGIN, 22);
  pdf.text(input.periodLabel, MARGIN, 28);
  pdf.setTextColor(...NAVY);
  y = 40;

  pdf.setFontSize(9);
  pdf.setTextColor(...MUTED);
  pdf.text(`${input.organizationName} · Dibuat ${input.generatedAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`, MARGIN, y);
  y += 8;

  const { summary } = input.data;

  // ── KPI cards ──
  addPageIfNeeded(28);
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text('Ringkasan', MARGIN, y);
  y += 6;

  const kpis = [
    { label: 'Pemasukan', value: formatCurrency(summary.totalIncome), color: GREEN },
    { label: 'Pengeluaran', value: formatCurrency(summary.totalExpense), color: RED },
    { label: 'Net Cashflow', value: formatCurrency(summary.netCashflow), color: summary.netCashflow >= 0 ? CYAN : RED },
    { label: 'Order Lunas', value: String(summary.orderCount), color: NAVY },
  ];

  const cardW = CONTENT_W / 4 - 2;
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (cardW + 2);
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(x, y, cardW, 18, 2, 2, 'FD');
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    pdf.text(k.label, x + 3, y + 6);
    pdf.setFontSize(9);
    pdf.setTextColor(...k.color);
    pdf.text(trunc(k.value, 18), x + 3, y + 14);
  });
  y += 24;

  const subKpis = [
    `CAPEX: ${formatCurrency(summary.totalCapex)}`,
    `OPEX: ${formatCurrency(summary.totalOpex)}`,
    `Berat: ${formatWeight(summary.totalWeight)}`,
    `Rata-rata order: ${formatCurrency(summary.avgOrderValue)}`,
  ];
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(subKpis.join('   ·   '), MARGIN, y);
  y += 10;

  // ── Bar chart: trend harian ──
  addPageIfNeeded(55);
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text('Trend Pemasukan vs Pengeluaran', MARGIN, y);
  y += 4;
  drawTrendChart(pdf, MARGIN, y, CONTENT_W, 42, input.data.dailyTrend);
  y += 50;

  // ── Income by branch (horizontal bars) ──
  if (input.data.incomeByBranch.length > 0) {
    addPageIfNeeded(40);
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text('Pemasukan per Cabang', MARGIN, y);
    y += 6;
    const maxB = Math.max(...input.data.incomeByBranch.map((b) => b.amount), 1);
    for (const b of input.data.incomeByBranch.slice(0, 8)) {
      addPageIfNeeded(8);
      pdf.setFontSize(8);
      pdf.setTextColor(...NAVY);
      pdf.text(trunc(b.branchName, 22), MARGIN, y + 3);
      const barX = MARGIN + 52;
      const barW = ((CONTENT_W - 90) * b.amount) / maxB;
      pdf.setFillColor(...CYAN);
      pdf.rect(barX, y, Math.max(barW, 1), 5, 'F');
      pdf.setTextColor(...MUTED);
      pdf.text(formatCurrency(b.amount), barX + barW + 2, y + 4);
      y += 8;
    }
    y += 4;
  }

  // ── Metode pembayaran ──
  if (input.data.paymentMethods.length > 0) {
    addPageIfNeeded(35);
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text('Metode Pembayaran', MARGIN, y);
    y += 6;
    drawDonutBars(
      pdf,
      MARGIN,
      y,
      CONTENT_W,
      input.data.paymentMethods.map((p) => ({
        label: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        value: p.amount,
      }))
    );
    y += 28;
  }

  // ── CAPEX vs OPEX ──
  if (input.data.capexOpexSplit.length > 0) {
    addPageIfNeeded(30);
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text('CAPEX vs OPEX', MARGIN, y);
    y += 6;
    drawDonutBars(
      pdf,
      MARGIN,
      y,
      CONTENT_W,
      input.data.capexOpexSplit.map((s) => ({ label: s.name, value: s.value }))
    );
    y += 22;
  }

  // ── Pengeluaran per kategori ──
  if (input.data.expenseDonut.length > 0) {
    addPageIfNeeded(30);
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    pdf.text('Pengeluaran per Kategori', MARGIN, y);
    y += 6;
    drawDonutBars(
      pdf,
      MARGIN,
      y,
      CONTENT_W,
      input.data.expenseDonut.slice(0, 8).map((e) => ({ label: e.name, value: e.value }))
    );
    y += 28;
  }

  // ── Analisis singkat ──
  addPageIfNeeded(25);
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text('Analisis', MARGIN, y);
  y += 6;
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  const marginPct =
    summary.totalIncome > 0
      ? (((summary.totalIncome - summary.totalExpense) / summary.totalIncome) * 100).toFixed(1)
      : '0';
  const insights = [
    `• Net cashflow periode: ${formatCurrency(summary.netCashflow)} (${summary.netCashflow >= 0 ? 'surplus' : 'defisit'})`,
    `• Margin operasional: ${marginPct}% dari pemasukan`,
    `• Rasio CAPEX: ${summary.totalExpense > 0 ? ((summary.totalCapex / summary.totalExpense) * 100).toFixed(0) : 0}% dari total pengeluaran`,
    `• ${summary.paymentCount} transaksi pemasukan · ${summary.expenseCount} pengeluaran tercatat`,
  ];
  for (const line of insights) {
    addPageIfNeeded(6);
    pdf.text(line, MARGIN, y);
    y += 5;
  }
  y += 6;

  // ── Tabel pengeluaran ──
  y = drawTable(pdf, y, 'Top Pengeluaran', ['Tanggal', 'Cabang', 'Kategori', 'Net'], input.data.expenseTable.slice(0, 12).map((e) => [
    new Date(e.date).toLocaleDateString('id-ID'),
    trunc(e.branchName, 14),
    trunc(`${e.title} (${e.type})`, 20),
    formatCurrency(e.netAmount),
  ]));

  // ── Tabel pemasukan ──
  y = drawTable(pdf, y, 'Top Pemasukan', ['Tanggal', 'Cabang', 'Order', 'Nominal'], input.data.incomeTable.slice(0, 12).map((p) => [
    new Date(p.paidAt).toLocaleDateString('id-ID'),
    trunc(p.branchName, 14),
    p.orderNumber,
    formatCurrency(p.amount),
  ]));

  // ── Order ──
  addPageIfNeeded(20);
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text('Ringkasan Order', MARGIN, y);
  y += 6;
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  const os = input.data.orders.summary;
  pdf.text(
    `Total ${os.total} order · Lunas ${os.paidCount} · Belum lunas ${os.unpaidCount} · Nilai lunas ${formatCurrency(os.totalRevenue)}`,
    MARGIN,
    y
  );
  y += 8;

  y = drawTable(
    pdf,
    y,
    'Order per Status',
    ['Status', 'Jumlah'],
    os.byStatus.map((s) => [s.label, String(s.count)])
  );

  y = drawTable(
    pdf,
    y,
    `Semua Order (${input.data.orders.orders.length})`,
    ['Tanggal', 'Cabang', 'Order', 'Pelanggan', 'Total', 'Status'],
    input.data.orders.orders.slice(0, 25).map((o) => [
      new Date(o.createdAt).toLocaleDateString('id-ID'),
      trunc(o.branchName, 10),
      o.orderNumber,
      trunc(o.customerName, 12),
      formatCurrency(o.total),
      trunc(o.statusLabel, 10),
    ])
  );

  // ── Stok ──
  addPageIfNeeded(20);
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text('Ringkasan Stok', MARGIN, y);
  y += 6;
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  const ss = input.data.stock.summary;
  pdf.text(
    `${ss.itemCount} item · ${ss.lowStockCount} menipis · ${ss.movementCount} pergerakan · ${ss.opnameCount} opname`,
    MARGIN,
    y
  );
  y += 8;

  y = drawTable(
    pdf,
    y,
    'Inventori (snapshot)',
    ['Cabang', 'Item', 'Stok', 'Min', 'Status'],
    input.data.stock.inventory.slice(0, 20).map((i) => [
      trunc(i.branchName, 10),
      trunc(i.name, 16),
      `${i.currentStock} ${i.unit}`,
      String(i.minStock),
      i.isLow ? 'MENIPIS' : 'OK',
    ])
  );

  y = drawTable(
    pdf,
    y,
    `Pergerakan Stok (${input.data.stock.movements.length})`,
    ['Tanggal', 'Cabang', 'Item', 'Tipe', 'Qty'],
    input.data.stock.movements.slice(0, 15).map((m) => [
      new Date(m.createdAt).toLocaleDateString('id-ID'),
      trunc(m.branchName, 10),
      trunc(m.itemName, 14),
      m.type,
      String(m.qty),
    ])
  );

  y = drawTable(
    pdf,
    y,
    `Stock Opname (${input.data.stock.opnames.length})`,
    ['Cabang', 'Status', 'Baris', 'Selisih Nilai', 'Selisih Kas'],
    input.data.stock.opnames.slice(0, 10).map((o) => [
      trunc(o.branchName, 12),
      o.status,
      String(o.lineCount),
      formatCurrency(o.totalVarianceCost),
      o.cashVariance != null ? formatCurrency(o.cashVariance) : '—',
    ])
  );

  // Footer last page
  pdf.setFontSize(7);
  pdf.setTextColor(...MUTED);
  pdf.text('AWW Laundry — FRESH · CLEAN · FUN · Laporan otomatis', MARGIN, 290);

  return Buffer.from(pdf.output('arraybuffer'));
}

function trunc(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function drawTrendChart(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  trend: Array<{ date: string; income: number; expense: number }>
) {
  if (trend.length === 0) return;
  const maxVal = Math.max(...trend.flatMap((t) => [t.income, t.expense]), 1);
  const n = trend.length;
  const groupW = w / n;
  const barW = Math.min(groupW * 0.35, 6);

  pdf.setDrawColor(226, 232, 240);
  pdf.rect(x, y, w, h);

  trend.forEach((t, i) => {
    const gx = x + i * groupW + groupW / 2;
    const incH = (t.income / maxVal) * (h - 8);
    const expH = (t.expense / maxVal) * (h - 8);
    pdf.setFillColor(...GREEN);
    pdf.rect(gx - barW - 0.5, y + h - 4 - incH, barW, incH, 'F');
    pdf.setFillColor(...RED);
    pdf.rect(gx + 0.5, y + h - 4 - expH, barW, expH, 'F');
    if (n <= 14) {
      pdf.setFontSize(5);
      pdf.setTextColor(...MUTED);
      pdf.text(t.date, gx - barW, y + h + 2, { align: 'center' });
    }
  });

  pdf.setFontSize(6);
  pdf.setTextColor(...GREEN);
  pdf.text('■ Pemasukan', x + 2, y - 1);
  pdf.setTextColor(...RED);
  pdf.text('■ Pengeluaran', x + 28, y - 1);
}

function drawDonutBars(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  items: Array<{ label: string; value: number }>
) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const colors: Array<[number, number, number]> = [CYAN, ORANGE, GREEN, NAVY, RED, [147, 51, 234]];
  let cy = y;
  items.forEach((item, i) => {
    const pct = item.value / total;
    const barW = (w - 60) * pct;
    pdf.setFillColor(...(colors[i % colors.length]));
    pdf.rect(x + 48, cy, Math.max(barW, 1), 5, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(...NAVY);
    pdf.text(trunc(item.label, 18), x, cy + 4);
    pdf.setTextColor(...MUTED);
    pdf.text(`${formatCurrency(item.value)} (${(pct * 100).toFixed(0)}%)`, x + 52 + barW, cy + 4);
    cy += 7;
  });
}

function drawTable(
  pdf: jsPDF,
  startY: number,
  title: string,
  headers: string[],
  rows: string[][]
): number {
  let y = startY;
  if (y > 250) {
    pdf.addPage();
    y = MARGIN;
  }
  pdf.setFontSize(11);
  pdf.setTextColor(...NAVY);
  pdf.text(title, MARGIN, y);
  y += 6;

  const colW = CONTENT_W / headers.length;
  pdf.setFillColor(241, 245, 249);
  pdf.rect(MARGIN, y, CONTENT_W, 7, 'F');
  pdf.setFontSize(7);
  pdf.setTextColor(...NAVY);
  headers.forEach((h, i) => pdf.text(h, MARGIN + i * colW + 2, y + 5));
  y += 7;

  for (const row of rows) {
    if (y > 280) {
      pdf.addPage();
      y = MARGIN;
    }
    pdf.setDrawColor(241, 245, 249);
    pdf.line(MARGIN, y, MARGIN + CONTENT_W, y);
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    row.forEach((cell, i) => pdf.text(trunc(cell, 24), MARGIN + i * colW + 2, y + 4));
    y += 6;
  }
  return y + 8;
}
