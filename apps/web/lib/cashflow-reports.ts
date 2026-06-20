import { prisma } from '@aww/database';
import { generateCashflowReportCsv } from '@/lib/cashflow-report-csv';
import { buildCashflowReportEmailHtml } from '@/lib/cashflow-report-email-html';
import { generateCashflowReportPdf } from '@/lib/cashflow-report-pdf';
import { sendCashflowReportEmail } from '@/lib/brevo';
import { getOwnerRecipients } from '@/lib/owner-recipients';
import { fetchFullOperationalReport } from '@/lib/operational-report-data';
import {
  type CashflowReportKind,
  REPORT_KIND_LABELS,
  reportDateRange,
  reportsDueNow,
  nowInWib,
} from '@/lib/report-periods';

export async function sendCashflowReportForOrg(
  organizationId: string,
  kind: CashflowReportKind,
  asOf = nowInWib()
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) throw new Error('Organisasi tidak ditemukan');

  const owners = await getOwnerRecipients(organizationId);
  if (owners.length === 0) {
    return { kind, organizationId, sent: 0, skipped: true, reason: 'no_owners' };
  }

  const { start, end, label, filenameSuffix } = reportDateRange(kind, asOf);
  const data = await fetchFullOperationalReport({
    organizationId,
    dateRange: { start, end },
    fullExport: true,
  });

  const generatedAt = asOf;
  const pdfBuffer = generateCashflowReportPdf({
    kind,
    periodLabel: label,
    organizationName: org.name,
    generatedAt,
    data,
  });
  const csvBuffer = generateCashflowReportCsv({
    periodLabel: label,
    organizationName: org.name,
    generatedAt,
    data,
  });

  const pdfFilename = `laporan-${filenameSuffix}.pdf`;
  const csvFilename = `laporan-${filenameSuffix}.csv`;
  const reportTitle = REPORT_KIND_LABELS[kind];
  let sent = 0;
  const errors: string[] = [];

  for (const owner of owners) {
    try {
      const htmlContent = buildCashflowReportEmailHtml({
        name: owner.name,
        reportTitle,
        periodLabel: label,
        organizationName: org.name,
        data,
      });
      const result = await sendCashflowReportEmail({
        to: owner.email,
        name: owner.name,
        reportTitle,
        periodLabel: label,
        htmlContent,
        pdfBuffer,
        pdfFilename,
        csvBuffer,
        csvFilename,
      });
      if (result.ok) sent += 1;
    } catch (e) {
      errors.push(`${owner.email}: ${e instanceof Error ? e.message : 'error'}`);
    }
  }

  return {
    kind,
    organizationId,
    period: label,
    sent,
    recipients: owners.length,
    errors,
  };
}

export async function processCashflowReports(input?: {
  force?: CashflowReportKind[];
  organizationId?: string;
  asOf?: Date;
}) {
  const asOf = input?.asOf ?? nowInWib();
  const kinds = reportsDueNow(asOf, input?.force);
  if (kinds.length === 0) {
    return { ok: true, skipped: true, reason: 'not_scheduled', wib: asOf.toISOString() };
  }

  const orgs = await prisma.organization.findMany({
    where: input?.organizationId ? { id: input.organizationId } : undefined,
    select: { id: true, name: true },
  });

  const results: Awaited<ReturnType<typeof sendCashflowReportForOrg>>[] = [];

  for (const org of orgs) {
    for (const kind of kinds) {
      const r = await sendCashflowReportForOrg(org.id, kind, asOf);
      results.push(r);
    }
  }

  return {
    ok: true,
    kinds,
    wib: asOf.toISOString(),
    results,
    totalSent: results.reduce((s, r) => s + r.sent, 0),
  };
}
