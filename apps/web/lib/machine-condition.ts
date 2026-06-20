export const MACHINE_CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Bagus' },
  { value: 'BROKEN', label: 'Rusak' },
  { value: 'MUST_REPLACE', label: 'Harus Diganti' },
] as const;

export type MachineCondition = (typeof MACHINE_CONDITION_OPTIONS)[number]['value'];

export const MACHINE_CONDITION_LABELS: Record<MachineCondition, string> = {
  GOOD: 'Bagus',
  BROKEN: 'Rusak',
  MUST_REPLACE: 'Harus Diganti',
};

export function deriveMachineCondition(
  status: string,
  latestTroubleNote?: string | null
): MachineCondition {
  if (status !== 'TROUBLE') return 'GOOD';
  const note = latestTroubleNote ?? '';
  if (note.toLowerCase().includes('harus diganti')) return 'MUST_REPLACE';
  return 'BROKEN';
}
