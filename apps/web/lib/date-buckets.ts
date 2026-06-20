/** Build last N calendar-day buckets ending today (local). */
export function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function sevenDaysAgo(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  d.setHours(0, 0, 0, 0);
  return d;
}

export type DashboardPeriod = 'today' | 'week' | 'month' | 'year';

export function periodRange(period: DashboardPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'week') {
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'year') {
    start.setMonth(0, 1);
  }

  return { start, end };
}

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  today: 'Hari Ini',
  week: 'Minggu Ini',
  month: 'Bulan Ini',
  year: 'Tahun Ini',
};
