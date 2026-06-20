/** Pemetaan kategori CAPEX → tipe mesin di board produksi */
export const MACHINE_CAPEX_CATEGORY_MAP: Record<string, string> = {
  'Mesin Cuci': 'WASHER',
  Pengering: 'DRYER',
  'Setrika & Peralatan': 'IRON',
  'Setrika Uap': 'IRON',
};

export const MACHINE_TYPE_OPTIONS = [
  { value: 'WASHER', label: 'Mesin Cuci (WASHER)' },
  { value: 'DRYER', label: 'Pengering (DRYER)' },
  { value: 'IRON', label: 'Setrika (IRON)' },
] as const;

export const MACHINE_TYPE_LABELS: Record<string, string> = {
  WASHER: 'Mesin Cuci',
  DRYER: 'Pengering',
  IRON: 'Setrika',
};

const ALLOWED_MACHINE_TYPES = new Set(['WASHER', 'DRYER', 'IRON']);

export function resolveMachineTypeFromCategory(category: string): string | null {
  const trimmed = category.trim();
  if (MACHINE_CAPEX_CATEGORY_MAP[trimmed]) return MACHINE_CAPEX_CATEGORY_MAP[trimmed];

  const lower = trimmed.toLowerCase();
  if (lower.includes('mesin cuci') || lower === 'washer') return 'WASHER';
  if (lower.includes('pengering') || lower === 'dryer') return 'DRYER';
  if (lower.includes('setrika') || lower === 'iron' || lower.includes('uap')) return 'IRON';

  return null;
}

export function isAllowedMachineType(type: string): boolean {
  return ALLOWED_MACHINE_TYPES.has(type);
}
