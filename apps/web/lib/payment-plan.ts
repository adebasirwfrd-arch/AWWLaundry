import type { CombinationPaymentInput, CustomerOrderPaymentInput } from '@aww/shared';

const PLAN_START = '<!--AWW_PAYMENT_PLAN:';
const PLAN_END = '-->';
const CUSTOMER_PAYMENT_START = '<!--AWW_CUSTOMER_PAYMENT:';

/** Simpan rencana pembayaran kombinasi di catatan order (embedded, tidak ganggu catatan user). */
export function embedPaymentPlanInNotes(
  notes: string | null | undefined,
  plan: CombinationPaymentInput
): string {
  const clean = stripPaymentPlanFromNotes(notes);
  const encoded = encodeURIComponent(JSON.stringify(plan));
  const marker = `${PLAN_START}${encoded}${PLAN_END}`;
  return clean ? `${clean}\n${marker}` : marker;
}

export function stripPaymentPlanFromNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  return notes.replace(/\n?<!--AWW_PAYMENT_PLAN:[^>]+-->/g, '').trim();
}

export function parsePaymentPlanFromNotes(
  notes: string | null | undefined
): CombinationPaymentInput | null {
  if (!notes) return null;
  const match = notes.match(/<!--AWW_PAYMENT_PLAN:([^>]+)-->/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as CombinationPaymentInput;
    if (!parsed.dpMethod || !parsed.remainingMethod || parsed.dpAmount == null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function inferCombinationFromPayments(
  total: number,
  payments: { method: string; amount: number }[]
): CombinationPaymentInput | null {
  if (payments.length === 0) return null;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paid <= 0 || paid >= total) return null;

  const dp = payments[0];
  return {
    dpMethod: dp.method as CombinationPaymentInput['dpMethod'],
    dpAmount: dp.amount,
    remainingMethod: 'QRIS',
    remainingTiming: 'LATER',
  };
}

export function resolveOrderPaymentPlan(
  total: number,
  notes: string | null | undefined,
  payments: { method: string; amount: number }[]
): CombinationPaymentInput | null {
  const fromCustomer = parseCustomerPaymentFromNotes(notes);
  if (fromCustomer?.mode === 'COMBINATION' && fromCustomer.combination) {
    return fromCustomer.combination;
  }
  return parsePaymentPlanFromNotes(notes) ?? inferCombinationFromPayments(total, payments);
}

export function embedCustomerPaymentInNotes(
  notes: string | null | undefined,
  payment: CustomerOrderPaymentInput
): string {
  const clean = stripCustomerPaymentFromNotes(stripPaymentPlanFromNotes(notes));
  let result = clean;

  if (payment.mode === 'COMBINATION' && payment.combination) {
    result = embedPaymentPlanInNotes(result || null, payment.combination);
  }

  const encoded = encodeURIComponent(JSON.stringify(payment));
  const marker = `${CUSTOMER_PAYMENT_START}${encoded}${PLAN_END}`;
  return result ? `${result}\n${marker}` : marker;
}

export function stripCustomerPaymentFromNotes(notes: string | null | undefined): string {
  if (!notes) return '';
  return notes.replace(/\n?<!--AWW_CUSTOMER_PAYMENT:[^>]+-->/g, '').trim();
}

export function parseCustomerPaymentFromNotes(
  notes: string | null | undefined
): CustomerOrderPaymentInput | null {
  if (!notes) return null;
  const match = notes.match(/<!--AWW_CUSTOMER_PAYMENT:([^>]+)-->/);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as CustomerOrderPaymentInput;
  } catch {
    return null;
  }
}
