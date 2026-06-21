import {
  parseCustomerPaymentFromNotes,
  parsePaymentPlanFromNotes,
} from '@/lib/payment-plan';
import { formatDayLabel } from '@/lib/date-buckets';

export type PaymentBehaviorMode =
  | 'FULL_UPFRONT'
  | 'CASH_AT_BRANCH'
  | 'PAY_LATER'
  | 'COMBINATION_DP'
  | 'COMBINATION_FULL'
  | 'POS_DEFERRED';

export const PAYMENT_BEHAVIOR_LABELS: Record<PaymentBehaviorMode, string> = {
  FULL_UPFRONT: 'Lunas di Awal',
  CASH_AT_BRANCH: 'Tunai di Kasir',
  PAY_LATER: 'Bayar Nanti',
  COMBINATION_DP: 'Kombinasi (DP)',
  COMBINATION_FULL: 'Kombinasi Lunas',
  POS_DEFERRED: 'POS — Bayar Saat Konfirmasi',
};

export const PAYMENT_BEHAVIOR_MODES: PaymentBehaviorMode[] = [
  'FULL_UPFRONT',
  'CASH_AT_BRANCH',
  'PAY_LATER',
  'COMBINATION_DP',
  'COMBINATION_FULL',
  'POS_DEFERRED',
];

type OrderForBehavior = {
  fromApp: boolean;
  paymentStatus: string;
  total: number;
  notes: string | null;
  createdAt: Date;
  payments: { amount: number; status: string }[];
};

export function sumPaidAmount(payments: { amount: number; status: string }[]) {
  return payments
    .filter((p) => p.status === 'PAID')
    .reduce((s, p) => s + p.amount, 0);
}

export function classifyOrderPaymentBehavior(order: OrderForBehavior): PaymentBehaviorMode {
  const customerPayment = parseCustomerPaymentFromNotes(order.notes);
  const plan = parsePaymentPlanFromNotes(order.notes);
  const paidAmount = sumPaidAmount(order.payments);

  if (customerPayment?.mode === 'PAY_LATER') return 'PAY_LATER';
  if (customerPayment?.mode === 'CASH') return 'CASH_AT_BRANCH';

  if (
    customerPayment?.mode === 'COMBINATION' ||
    order.paymentStatus === 'PARTIAL' ||
    plan
  ) {
    const remainingLater =
      customerPayment?.combination?.remainingTiming === 'LATER' ||
      plan?.remainingTiming === 'LATER' ||
      order.paymentStatus === 'PARTIAL';
    return remainingLater ? 'COMBINATION_DP' : 'COMBINATION_FULL';
  }

  if (customerPayment?.mode === 'QRIS' || customerPayment?.mode === 'BANK_TRANSFER') {
    return 'FULL_UPFRONT';
  }

  if (!order.fromApp) {
    if (order.paymentStatus === 'UNPAID' && paidAmount === 0) return 'POS_DEFERRED';
    if (order.paymentStatus === 'PARTIAL') return 'COMBINATION_DP';
    return 'FULL_UPFRONT';
  }

  if (order.paymentStatus === 'UNPAID') return 'CASH_AT_BRANCH';
  return 'FULL_UPFRONT';
}

export function buildPaymentBehaviorAnalytics(
  orders: OrderForBehavior[],
  chartDays: Date[]
) {
  const byModeMap = new Map<
    PaymentBehaviorMode,
    { count: number; orderTotal: number; collected: number; outstanding: number }
  >();

  for (const mode of PAYMENT_BEHAVIOR_MODES) {
    byModeMap.set(mode, { count: 0, orderTotal: 0, collected: 0, outstanding: 0 });
  }

  let dpOrders = 0;
  let dpFullyPaid = 0;
  let payLaterOrders = 0;
  let payLaterCollected = 0;

  const dailyMap = new Map<string, Record<PaymentBehaviorMode, number>>();
  for (const day of chartDays) {
    dailyMap.set(formatDayLabel(day), {
      FULL_UPFRONT: 0,
      CASH_AT_BRANCH: 0,
      PAY_LATER: 0,
      COMBINATION_DP: 0,
      COMBINATION_FULL: 0,
      POS_DEFERRED: 0,
    });
  }

  for (const order of orders) {
    const mode = classifyOrderPaymentBehavior(order);
    const collected = sumPaidAmount(order.payments);
    const outstanding = Math.max(0, Math.round(order.total - collected));
    const bucket = byModeMap.get(mode)!;
    bucket.count += 1;
    bucket.orderTotal += order.total;
    bucket.collected += collected;
    bucket.outstanding += outstanding;

    const dayKey = formatDayLabel(new Date(order.createdAt));
    const dayRow = dailyMap.get(dayKey);
    if (dayRow) dayRow[mode] += 1;

    if (mode === 'COMBINATION_DP') {
      dpOrders += 1;
      if (order.paymentStatus === 'PAID') dpFullyPaid += 1;
    }
    if (mode === 'PAY_LATER') {
      payLaterOrders += 1;
      if (collected > 0) payLaterCollected += 1;
    }
  }

  const byMode = PAYMENT_BEHAVIOR_MODES.map((mode) => {
    const row = byModeMap.get(mode)!;
    return {
      mode,
      label: PAYMENT_BEHAVIOR_LABELS[mode],
      ...row,
    };
  }).filter((row) => row.count > 0);

  const daily = chartDays.map((day) => {
    const key = formatDayLabel(day);
    const counts = dailyMap.get(key) ?? {
      FULL_UPFRONT: 0,
      CASH_AT_BRANCH: 0,
      PAY_LATER: 0,
      COMBINATION_DP: 0,
      COMBINATION_FULL: 0,
      POS_DEFERRED: 0,
    };
    return {
      date: key,
      payLater: counts.PAY_LATER,
      combinationDp: counts.COMBINATION_DP,
      fullUpfront: counts.FULL_UPFRONT,
      cashAtBranch: counts.CASH_AT_BRANCH,
      other:
        counts.COMBINATION_FULL + counts.POS_DEFERRED,
    };
  });

  const totalOutstanding = byMode.reduce((s, r) => s + r.outstanding, 0);
  const payLaterOutstanding =
    byModeMap.get('PAY_LATER')?.outstanding ?? 0;
  const dpOutstanding =
    byModeMap.get('COMBINATION_DP')?.outstanding ?? 0;

  return {
    byMode,
    daily,
    outstanding: {
      total: totalOutstanding,
      payLater: payLaterOutstanding,
      combinationDp: dpOutstanding,
    },
    collection: {
      dp: {
        orders: dpOrders,
        fullyPaid: dpFullyPaid,
        rate: dpOrders > 0 ? Math.round((dpFullyPaid / dpOrders) * 100) : 0,
      },
      payLater: {
        orders: payLaterOrders,
        collected: payLaterCollected,
        rate: payLaterOrders > 0 ? Math.round((payLaterCollected / payLaterOrders) * 100) : 0,
      },
    },
  };
}
