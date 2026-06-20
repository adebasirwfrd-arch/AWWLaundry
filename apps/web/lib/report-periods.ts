/** Periode laporan cashflow — timezone WIB (Asia/Jakarta). */

export type CashflowReportKind = 'daily' | 'weekly' | 'monthly';

const WIB = 'Asia/Jakarta';
const REPORT_HOUR = 17; // 17:00 WIB

export function nowInWib(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: WIB }));
}

export function wibParts(d = nowInWib()) {
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    date: d.getDate(),
    day: d.getDay(), // 0 = Minggu
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

function startOfWibDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWibDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Rentang tanggal untuk laporan — sesuai jenis periode. */
export function reportDateRange(kind: CashflowReportKind, asOf = nowInWib()): {
  start: Date;
  end: Date;
  label: string;
  filenameSuffix: string;
} {
  const parts = wibParts(asOf);

  if (kind === 'daily') {
    const start = startOfWibDay(asOf);
    const end = new Date(asOf);
    end.setHours(REPORT_HOUR, 0, 0, 0);
    if (end.getTime() < start.getTime()) end.setTime(asOf.getTime());
    const label = start.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: WIB,
    });
    const suffix = `${parts.year}-${String(parts.month + 1).padStart(2, '0')}-${String(parts.date).padStart(2, '0')}`;
    return { start, end, label: `Harian — ${label}`, filenameSuffix: `harian-${suffix}` };
  }

  if (kind === 'weekly') {
    const start = startOfWibDay(asOf);
    const day = start.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - diff);
    const end = new Date(asOf);
    end.setHours(REPORT_HOUR, 0, 0, 0);
    const label = `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: WIB })} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: WIB })}`;
    const suffix = `minggu-${parts.year}-w${String(Math.ceil(parts.date / 7)).padStart(2, '0')}`;
    return { start, end, label: `Mingguan — ${label}`, filenameSuffix: suffix };
  }

  // Bulanan: bulan kalender sebelumnya (laporan tgl 1 = data bulan lalu penuh)
  const prevMonth = parts.month === 0 ? 11 : parts.month - 1;
  const prevYear = parts.month === 0 ? parts.year - 1 : parts.year;
  const start = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
  const end = endOfWibDay(new Date(prevYear, prevMonth + 1, 0));
  const label = start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: WIB });
  const suffix = `bulanan-${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
  return { start, end, label: `Bulanan — ${label}`, filenameSuffix: suffix };
}

/** Hari dalam rentang (untuk chart trend). */
export function daysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = startOfWibDay(start);
  const last = startOfWibDay(end);
  while (d.getTime() <= last.getTime()) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

/** Tentukan laporan mana yang harus dikirim saat cron (jam 17:00 WIB). */
export function reportsDueNow(asOf = nowInWib(), force?: CashflowReportKind[]): CashflowReportKind[] {
  if (force?.length) return force;

  const { hour, date, day } = wibParts(asOf);
  if (hour !== REPORT_HOUR) return [];

  const due: CashflowReportKind[] = ['daily'];
  if (day === 0) due.push('weekly'); // Minggu 17:00
  if (date === 1) due.push('monthly'); // Tgl 1, 17:00
  return due;
}

export const REPORT_KIND_LABELS: Record<CashflowReportKind, string> = {
  daily: 'Laporan Harian',
  weekly: 'Laporan Mingguan',
  monthly: 'Laporan Bulanan',
};
