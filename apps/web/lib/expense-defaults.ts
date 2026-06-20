import type { ExpenseType } from '@aww/database';

export const DEFAULT_CAPEX_CATEGORIES = [
  'Sewa Ruko',
  'Mesin Cuci',
  'Pengering',
  'Setrika Uap',
  'Setrika & Peralatan',
  'Renovasi & Interior',
  'Kendaraan Operasional',
] as const;

export const DEFAULT_OPEX_CATEGORIES = [
  'Gaji Karyawan',
  'Sabun & Detergen',
  'Listrik',
  'Air',
  'Transport',
  'Internet & Telepon',
  'Pemeliharaan Rutin',
  'Marketing',
] as const;

export const CAPEX_MIN_HINT = 2_000_000;

export function defaultCategories(type: ExpenseType): readonly string[] {
  return type === 'CAPEX' ? DEFAULT_CAPEX_CATEGORIES : DEFAULT_OPEX_CATEGORIES;
}

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  CAPEX: 'CAPEX — Capital Expenditure',
  OPEX: 'OPEX — Operational Expenditure',
};
