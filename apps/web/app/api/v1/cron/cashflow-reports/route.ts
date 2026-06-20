import { NextRequest, NextResponse } from 'next/server';
import { processCashflowReports } from '@/lib/cashflow-reports';
import type { CashflowReportKind } from '@/lib/report-periods';

/**
 * Cron — kirim laporan cashflow PDF ke owner.
 * Jadwal WIB (Asia/Jakarta):
 * - Harian: setiap hari 17:00
 * - Mingguan: Minggu 17:00
 * - Bulanan: tgl 1, 17:00 (data bulan sebelumnya)
 *
 * Test: ?force=daily,weekly,monthly&secret=...
 */
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.nextUrl.searchParams.get('secret');

  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const forceParam = req.nextUrl.searchParams.get('force');
  const force = forceParam
    ? (forceParam.split(',').filter((k) => ['daily', 'weekly', 'monthly'].includes(k)) as CashflowReportKind[])
    : undefined;

  const orgId = req.nextUrl.searchParams.get('orgId') ?? undefined;

  const result = await processCashflowReports({
    force,
    organizationId: orgId,
  });

  return NextResponse.json(result);
}
