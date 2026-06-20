/**
 * Test generate & kirim laporan cashflow (PDF + CSV + email).
 *
 * Dari folder blueprint/aww-laundry:
 *   npm run test:cashflow-report -- daily
 *   npm run test:cashflow-report -- daily --send
 */
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { prisma } from '@aww/database';
import type { CashflowReportKind } from '@/lib/report-periods';
import { sendCashflowReportForOrg } from '@/lib/cashflow-reports';
import { generateCashflowReportCsv } from '@/lib/cashflow-report-csv';
import { fetchCashflowOverview } from '@/lib/cashflow-analytics';
import { generateCashflowReportPdf } from '@/lib/cashflow-report-pdf';
import { reportDateRange } from '@/lib/report-periods';

const webRoot = path.resolve(__dirname, '..');

const kind = (process.argv[2] as CashflowReportKind) || 'daily';
const shouldSend = process.argv.includes('--send');

async function main() {
  const org = await prisma.organization.findFirst({ select: { id: true, name: true } });
  if (!org) throw new Error('No organization');

  const { start, end, label, filenameSuffix } = reportDateRange(kind);
  console.log(`Period: ${label}`);
  console.log(`Range: ${start.toISOString()} → ${end.toISOString()}`);

  const data = await fetchCashflowOverview({
    organizationId: org.id,
    dateRange: { start, end },
    fullExport: true,
  });
  const pdf = generateCashflowReportPdf({
    kind,
    periodLabel: label,
    organizationName: org.name,
    generatedAt: new Date(),
    data,
  });

  const csv = generateCashflowReportCsv({
    periodLabel: label,
    organizationName: org.name,
    generatedAt: new Date(),
    data,
  });

  const outDir = path.join(webRoot, 'tmp');
  mkdirSync(outDir, { recursive: true });
  const pdfPath = path.join(outDir, `cashflow-${filenameSuffix}.pdf`);
  const csvPath = path.join(outDir, `cashflow-${filenameSuffix}.csv`);
  writeFileSync(pdfPath, pdf);
  writeFileSync(csvPath, csv);
  console.log(`PDF saved: ${pdfPath}`);
  console.log(`CSV saved: ${csvPath}`);
  console.log(`Summary: income=${data.summary.totalIncome} expense=${data.summary.totalExpense}`);

  if (shouldSend) {
    const r = await sendCashflowReportForOrg(org.id, kind);
    console.log('Email result:', JSON.stringify(r, null, 2));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
