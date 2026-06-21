import { PAYMENT_METHOD_LABELS } from '@aww/shared';
import type { ReceiptPaymentLine } from '@/components/pos/thermal-receipt';
import { parseCustomerPaymentFromNotes, resolveOrderPaymentPlan } from '@/lib/payment-plan';

export function buildReceiptPaymentFields(input: {
  total: number;
  paymentStatus: string;
  paymentMode?: string;
  payments: { method: string; amount: number }[];
  notes?: string | null;
}): {
  payments?: ReceiptPaymentLine[];
  remainingAmount?: number;
  remainingMethod?: string;
  paymentMethod?: string;
} {
  const paidAmount = input.payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, input.total - paidAmount);

  if (paidAmount > 0 && remaining > 0) {
    const plan = resolveOrderPaymentPlan(input.total, input.notes, input.payments);
    return {
      payments: input.payments.map((p, i) => ({
        method: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        amount: p.amount,
        label: i === 0 ? 'DP Awal' : 'Pelunasan',
      })),
      remainingAmount: remaining,
      remainingMethod: plan?.remainingMethod
        ? (PAYMENT_METHOD_LABELS[plan.remainingMethod] ?? plan.remainingMethod)
        : undefined,
      paymentMethod: input.payments[0]?.method,
    };
  }

  if (input.paymentStatus === 'PAID' && input.payments.length > 0) {
    return {
      payments: input.payments.map((p) => ({
        method: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        amount: p.amount,
        label: 'Pembayaran',
      })),
      paymentMethod: input.payments[0]?.method,
    };
  }

  const customerPayment = parseCustomerPaymentFromNotes(input.notes);
  return {
    paymentMethod: customerPayment?.mode ?? input.paymentMode,
  };
}

export function getReceiptPaymentStatusLabel(data: {
  paid?: boolean;
  paymentStatus?: string;
  paymentMode?: string;
  paymentMethod?: string;
}): { label: string; tone: 'paid' | 'partial' | 'unpaid' | 'later' } {
  if (data.paymentStatus === 'PARTIAL') {
    return { label: 'DP DITERIMA', tone: 'partial' };
  }
  if (data.paid || data.paymentStatus === 'PAID') {
    const method = data.paymentMethod
      ? (PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod)
      : 'Tunai';
    return { label: `SUDAH BAYAR (${method})`, tone: 'paid' };
  }
  if (data.paymentMode === 'PAY_LATER') {
    return { label: 'BAYAR NANTI', tone: 'later' };
  }
  return { label: 'BELUM BAYAR', tone: 'unpaid' };
}
