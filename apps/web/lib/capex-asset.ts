import type { BuildingStatus } from '@aww/database';

export const BUILDING_STATUS_OPTIONS = [
  { value: 'SEWA', label: 'Sewa' },
  { value: 'BELI', label: 'Beli' },
] as const;

export const BUILDING_STATUS_LABELS: Record<BuildingStatus, string> = {
  SEWA: 'Sewa',
  BELI: 'Beli',
};

export function isBuildingCapexCategory(category: string): boolean {
  const lower = category.trim().toLowerCase();
  return lower.includes('ruko') || lower.includes('sewa');
}

export function purchaseDateFromInputs(
  purchaseYear: number | null | undefined,
  expenseDate: Date
): Date {
  if (purchaseYear && purchaseYear >= 1900 && purchaseYear <= new Date().getFullYear() + 1) {
    return new Date(purchaseYear, expenseDate.getMonth(), expenseDate.getDate());
  }
  return expenseDate;
}

export function formatUsageDuration(purchaseDate: Date, asOf: Date = new Date()): string {
  const start = new Date(purchaseDate);
  if (asOf.getTime() < start.getTime()) return '0 hari';

  let years = asOf.getFullYear() - start.getFullYear();
  let months = asOf.getMonth() - start.getMonth();
  let days = asOf.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(asOf.getFullYear(), asOf.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} tahun`);
  if (months > 0) parts.push(`${months} bulan`);
  if (days > 0 && years === 0) parts.push(`${days} hari`);
  if (parts.length === 0) parts.push('kurang dari 1 bulan');

  return parts.join(' ');
}
