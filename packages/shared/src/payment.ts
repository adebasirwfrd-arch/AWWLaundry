export const POS_SINGLE_PAYMENT_METHODS = ['CASH', 'QRIS', 'BANK_TRANSFER'] as const;
export type PosSinglePaymentMethod = (typeof POS_SINGLE_PAYMENT_METHODS)[number];

export const SPLIT_PAYMENT_METHODS = ['CASH', 'QRIS', 'BANK_TRANSFER'] as const;
export type SplitPaymentMethod = (typeof SPLIT_PAYMENT_METHODS)[number];

export type RemainingTiming = 'NOW' | 'LATER';

export interface CombinationPaymentInput {
  dpMethod: SplitPaymentMethod;
  dpAmount: number;
  dpProofUrl?: string;
  remainingMethod: SplitPaymentMethod;
  remainingTiming: RemainingTiming;
  remainingProofUrl?: string;
}

export interface PaymentLineItem {
  method: SplitPaymentMethod;
  amount: number;
  label: string;
  proofUrl?: string;
}

export interface CombinationPaymentPlan {
  dpAmount: number;
  remainingAmount: number;
  payments: PaymentLineItem[];
  paymentStatus: 'PAID' | 'PARTIAL';
  remainingTiming: RemainingTiming;
  remainingMethod?: SplitPaymentMethod;
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: 'Belum Bayar',
  PARTIAL: 'DP / Sebagian',
  PAID: 'Lunas',
  REFUNDED: 'Dikembalikan',
};

export function methodNeedsProof(method: string): boolean {
  return method === 'QRIS' || method === 'BANK_TRANSFER';
}

export function computeCombinationPayment(
  total: number,
  input: CombinationPaymentInput
): CombinationPaymentPlan {
  const dpAmount = Math.round(input.dpAmount);
  const remainingAmount = Math.round(total - dpAmount);

  if (dpAmount <= 0) throw new Error('Jumlah DP harus lebih dari 0');
  if (dpAmount >= total) throw new Error('Jumlah DP harus kurang dari total');
  if (remainingAmount <= 0) throw new Error('Sisa pembayaran tidak valid');

  const payments: PaymentLineItem[] = [
    {
      method: input.dpMethod,
      amount: dpAmount,
      label: 'DP Awal',
      proofUrl: input.dpProofUrl,
    },
  ];

  if (input.remainingTiming === 'NOW') {
    payments.push({
      method: input.remainingMethod,
      amount: remainingAmount,
      label: 'Pelunasan',
      proofUrl: input.remainingProofUrl,
    });
  }

  return {
    dpAmount,
    remainingAmount,
    payments,
    paymentStatus: input.remainingTiming === 'NOW' ? 'PAID' : 'PARTIAL',
    remainingTiming: input.remainingTiming,
    remainingMethod: input.remainingTiming === 'LATER' ? input.remainingMethod : undefined,
  };
}

export function formatPaymentSummary(
  payments: { method: string; amount: number; label?: string }[],
  methodLabels: Record<string, string>
): string {
  return payments
    .map((p) => {
      const method = methodLabels[p.method] ?? p.method;
      const prefix = p.label ? `${p.label}: ` : '';
      return `${prefix}${method}`;
    })
    .join(' + ');
}

export function computeRemainingBalance(
  total: number,
  paidAmount: number
): number {
  return Math.max(0, Math.round(total - paidAmount));
}

export type CustomerPaymentMode = 'CASH' | 'QRIS' | 'BANK_TRANSFER' | 'COMBINATION' | 'PAY_LATER';

export interface CustomerOrderPaymentInput {
  mode: CustomerPaymentMode;
  proofUrl?: string;
  combination?: CombinationPaymentInput;
}

export interface TransferBankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export const TRANSFER_BANK_DETAILS: TransferBankDetails & { formatted: string } = {
  bankName: 'Bank Mandiri',
  accountName: 'AN JOKOVIC',
  accountNumber: '0088474666126',
  formatted: 'Bank Mandiri · a.n. AN JOKOVIC · 0088474666126',
} as const;

export const CUSTOMER_PAYMENT_MODE_LABELS: Record<CustomerPaymentMode, string> = {
  CASH: 'Tunai — Bayar di Kasir',
  QRIS: 'QRIS',
  BANK_TRANSFER: 'Transfer Bank',
  COMBINATION: 'Kombinasi (DP)',
  PAY_LATER: 'Bayar Nanti — setelah selesai',
};

/** Pesanan bayar nanti boleh masuk produksi meski status UNPAID. */
export function isPayLaterCustomerPayment(mode: CustomerPaymentMode | undefined | null): boolean {
  return mode === 'PAY_LATER';
}

export function canEnterProduction(
  paymentStatus: string,
  customerPaymentMode?: CustomerPaymentMode | null
): boolean {
  if (paymentStatus === 'UNPAID') return isPayLaterCustomerPayment(customerPaymentMode);
  return paymentStatus === 'PAID' || paymentStatus === 'PARTIAL';
}
