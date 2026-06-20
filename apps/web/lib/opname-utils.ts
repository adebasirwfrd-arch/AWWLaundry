export type OpnameResumeStep = 'count' | 'cash' | 'review';

export function inferOpnameResumeStep(opname: {
  status: string;
  cashExpected: number | null;
  cashActual: number | null;
}): OpnameResumeStep {
  if (opname.status === 'PENDING_APPROVAL') return 'review';
  if (opname.cashExpected != null && opname.cashActual != null) return 'review';
  if (opname.status === 'COUNTING') return 'cash';
  return 'count';
}

export function buildOpnameResumeUrl(
  role: string,
  branchId: string,
  step: OpnameResumeStep
): string {
  const params = new URLSearchParams({ tab: 'opname', step });
  if (role === 'OWNER' || role === 'SUPER_ADMIN' || role === 'MANAGER') {
    params.set('branch', branchId);
    return `/owner/inventory?${params.toString()}`;
  }
  return `/cashier/inventory?${params.toString()}`;
}
