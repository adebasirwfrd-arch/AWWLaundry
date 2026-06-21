import {
  formatCurrency,
  PAYMENT_METHOD_LABELS,
  computeRemainingBalance,
} from '@aww/shared';
import {
  stripCustomerPaymentFromNotes,
  stripPaymentPlanFromNotes,
  resolveOrderPaymentPlan,
  resolveOrderCustomerPayment,
} from '@/lib/payment-plan';

export function getCleanUserNote(notes: string | null | undefined): string {
  return stripCustomerPaymentFromNotes(stripPaymentPlanFromNotes(notes));
}

function timingLabel(timing: 'NOW' | 'LATER'): string {
  return timing === 'LATER' ? 'setelah selesai' : 'sekarang';
}

function methodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/** Catatan tampilan: catatan user jika ada, otherwise ringkasan pembayaran otomatis. */
export function buildOrderNotesDisplay(input: {
  notes?: string | null;
  fromApp: boolean;
  paymentStatus: string;
  total: number;
  payments: { method: string; amount: number }[];
}): string {
  const userNote = getCleanUserNote(input.notes);
  if (userNote) return userNote;

  const paidAmount = input.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = computeRemainingBalance(input.total, paidAmount);
  const customerPayment = resolveOrderCustomerPayment({
    fromApp: input.fromApp,
    notes: input.notes,
    paymentStatus: input.paymentStatus,
    payments: input.payments,
  });
  const plan = resolveOrderPaymentPlan(input.total, input.notes, input.payments);

  if (input.paymentStatus === 'PAID' && paidAmount > 0) {
    if (input.payments.length === 1) {
      const p = input.payments[0];
      return `Metode pembayaran ${methodLabel(p.method)} — lunas ${formatCurrency(p.amount)}.`;
    }
    const parts = input.payments
      .map((p) => `${methodLabel(p.method)} ${formatCurrency(p.amount)}`)
      .join(', ');
    return `Pembayaran: ${parts} — total lunas ${formatCurrency(input.total)}.`;
  }

  if (paidAmount > 0 && remaining > 0) {
    if (plan) {
      const dpPaid = input.payments[0];
      const dpMethod = methodLabel(dpPaid?.method ?? plan.dpMethod);
      const remMethod = methodLabel(plan.remainingMethod);
      return `Metode pembayaran kombinasi — sudah bayar DP ${formatCurrency(paidAmount)} via ${dpMethod}, sisa ${formatCurrency(remaining)} via ${remMethod} (${timingLabel(plan.remainingTiming)}).`;
    }
    return `Sudah bayar ${formatCurrency(paidAmount)} — sisa ${formatCurrency(remaining)}.`;
  }

  if (customerPayment?.mode === 'COMBINATION') {
    const cp = customerPayment.combination ?? plan;
    if (cp) {
      const rem = computeRemainingBalance(input.total, cp.dpAmount);
      return `Metode pembayaran kombinasi — DP ${formatCurrency(cp.dpAmount)} via ${methodLabel(cp.dpMethod)}, sisa ${formatCurrency(rem)} via ${methodLabel(cp.remainingMethod)} (${timingLabel(cp.remainingTiming)}).`;
    }
  }

  if (plan && input.paymentStatus !== 'PAID') {
    const rem = computeRemainingBalance(input.total, plan.dpAmount);
    return `Metode pembayaran kombinasi — DP ${formatCurrency(plan.dpAmount)} via ${methodLabel(plan.dpMethod)}, sisa ${formatCurrency(rem)} via ${methodLabel(plan.remainingMethod)} (${timingLabel(plan.remainingTiming)}).`;
  }

  switch (customerPayment?.mode) {
    case 'CASH':
      return 'Metode pembayaran tunai — bayar di kasir saat cucian diterima.';
    case 'QRIS':
      return `Metode pembayaran QRIS — ${formatCurrency(input.total)}.`;
    case 'BANK_TRANSFER':
      return `Metode pembayaran transfer bank — ${formatCurrency(input.total)}.`;
    case 'PAY_LATER':
      return `Metode pembayaran bayar nanti — ${formatCurrency(input.total)} setelah cucian selesai.`;
    default:
      break;
  }

  if (input.payments.length === 1 && input.paymentStatus !== 'UNPAID') {
    const p = input.payments[0];
    return `Metode pembayaran ${methodLabel(p.method)} — ${formatCurrency(p.amount)}.`;
  }

  if (input.paymentStatus === 'UNPAID') {
    return 'Belum ada pembayaran tercatat.';
  }

  return '';
}
