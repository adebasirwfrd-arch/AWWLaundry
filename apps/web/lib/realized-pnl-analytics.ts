import { formatDayLabel, sameCalendarDay } from '@/lib/date-buckets';
import {
  classifyOrderPaymentBehavior,
  PAYMENT_BEHAVIOR_LABELS,
  sumPaidAmount,
  type PaymentBehaviorMode,
} from '@/lib/payment-behavior-analytics';

type OrderForPnl = {
  fromApp: boolean;
  paymentStatus: string;
  total: number;
  notes: string | null;
  createdAt: Date;
  payments: { amount: number; status: string; paidAt?: Date }[];
};

type ExpenseRow = {
  date: Date;
  amount: number;
  discount?: number | null;
  netAmount?: number | null;
};

function expenseNet(row: ExpenseRow) {
  if (row.netAmount != null && row.netAmount > 0) return row.netAmount;
  return Math.max(0, row.amount - (row.discount ?? 0));
}

function unrealizedBucket(mode: PaymentBehaviorMode): 'payLater' | 'dp' | 'other' {
  if (mode === 'PAY_LATER' || mode === 'CASH_AT_BRANCH' || mode === 'POS_DEFERRED') return 'payLater';
  if (mode === 'COMBINATION_DP') return 'dp';
  return 'other';
}

export function buildRealizedPnlAnalytics(input: {
  periodOrders: OrderForPnl[];
  chartDays: Date[];
  chartPayments: Array<{ paidAt: Date; amount: number }>;
  chartExpenses: ExpenseRow[];
  realizedIncome: number;
  realizedExpense: number;
}) {
  const { periodOrders, chartDays, chartPayments, chartExpenses, realizedIncome, realizedExpense } =
    input;

  let bookedOrderValue = 0;
  let collectedOnPeriodOrders = 0;
  let payLaterOutstanding = 0;
  let dpOutstanding = 0;
  let otherOutstanding = 0;

  const breakdownMap = new Map<
    PaymentBehaviorMode,
    { realized: number; unrealized: number; orderTotal: number }
  >();

  for (const order of periodOrders) {
    const mode = classifyOrderPaymentBehavior(order);
    const collected = sumPaidAmount(order.payments);
    const outstanding = Math.max(0, Math.round(order.total - collected));
    bookedOrderValue += order.total;
    collectedOnPeriodOrders += collected;

    const bucket = unrealizedBucket(mode);
    if (bucket === 'payLater') payLaterOutstanding += outstanding;
    else if (bucket === 'dp') dpOutstanding += outstanding;
    else otherOutstanding += outstanding;

    const row = breakdownMap.get(mode) ?? {
      realized: 0,
      unrealized: 0,
      orderTotal: 0,
    };
    row.realized += collected;
    row.unrealized += outstanding;
    row.orderTotal += order.total;
    breakdownMap.set(mode, row);
  }

  const unrealizedIncome = payLaterOutstanding + dpOutstanding + otherOutstanding;
  const realizedPnl = realizedIncome - realizedExpense;
  const realizationRate =
    bookedOrderValue > 0 ? Math.round((collectedOnPeriodOrders / bookedOrderValue) * 100) : 100;

  const daily = chartDays.map((day) => {
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const dayIncome = chartPayments
      .filter((p) => p.paidAt >= day && p.paidAt <= dayEnd)
      .reduce((s, p) => s + p.amount, 0);
    const dayExpense = chartExpenses
      .filter((e) => e.date >= day && e.date <= dayEnd)
      .reduce((s, e) => s + expenseNet(e), 0);

    const dayOrders = periodOrders.filter((o) => sameCalendarDay(new Date(o.createdAt), day));
    const dayBooked = dayOrders.reduce((s, o) => s + o.total, 0);
    const dayCollected = dayOrders.reduce((s, o) => s + sumPaidAmount(o.payments), 0);
    const dayUnrealized = dayOrders.reduce(
      (s, o) => s + Math.max(0, Math.round(o.total - sumPaidAmount(o.payments))),
      0
    );

    return {
      date: formatDayLabel(day),
      realizedIncome: dayIncome,
      realizedExpense: dayExpense,
      realizedPnl: dayIncome - dayExpense,
      bookedOrderValue: dayBooked,
      unrealizedIncome: dayUnrealized,
      collectedOnOrders: dayCollected,
    };
  });

  return {
    realizedIncome,
    realizedExpense,
    realizedPnl,
    bookedOrderValue,
    collectedOnPeriodOrders,
    unrealizedIncome,
    payLaterOutstanding,
    dpOutstanding,
    otherOutstanding,
    realizationRate,
    daily,
    waterfall: [
      { name: 'Realized', realized: realizedIncome, unrealized: 0 },
      { name: 'Bayar Nanti', realized: 0, unrealized: payLaterOutstanding },
      { name: 'Sisa DP', realized: 0, unrealized: dpOutstanding },
      { name: 'Lainnya', realized: 0, unrealized: otherOutstanding },
    ].filter((row) => row.realized > 0 || row.unrealized > 0),
    breakdown: [...breakdownMap.entries()]
      .filter(([, row]) => row.orderTotal > 0)
      .map(([mode, row]) => ({
        mode,
        label: PAYMENT_BEHAVIOR_LABELS[mode],
        ...row,
      })),
  };
}

export type RealizedPnlAnalytics = ReturnType<typeof buildRealizedPnlAnalytics>;
