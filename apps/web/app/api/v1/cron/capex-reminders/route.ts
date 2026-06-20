import { NextRequest, NextResponse } from 'next/server';
import { processCapexDueReminders } from '@/lib/capex-due-reminders';

/** Cron endpoint — kirim reminder CAPEX 3 bln & 1 bln sebelum due date. */
export async function GET(req: NextRequest) {
  const secret =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
    req.nextUrl.searchParams.get('secret');

  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processCapexDueReminders();
  return NextResponse.json({ ok: true, ...result });
}
