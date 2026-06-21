export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Diterima',
  WASHING: 'Mencuci',
  DRYING: 'Mengering',
  IRONING: 'Menyetrika',
  FOLDING: 'Melipat',
  READY: 'Siap Diambil',
  PICKED_UP: 'Sudah Diambil',
  DELIVERED: 'Diantar',
  CANCELLED: 'Dibatalkan',
  ON_HOLD: 'Ditahan',
};

/** Label status cucian untuk tampilan pelanggan (struk & riwayat). */
export const CUSTOMER_LAUNDRY_STATUS: Record<string, string> = {
  ON_HOLD: 'Cucian belum diterima laundry',
  RECEIVED: 'Diterima — menunggu dicuci',
  WASHING: 'Sedang dicuci',
  DRYING: 'Sedang dikeringkan',
  IRONING: 'Sedang disetrika',
  FOLDING: 'Sedang dilipat',
  READY: 'Siap diambil',
  PICKED_UP: 'Sudah diambil',
  DELIVERED: 'Sudah diantar',
  CANCELLED: 'Dibatalkan',
};

export function getCustomerLaundryStatus(status: string): string {
  return CUSTOMER_LAUNDRY_STATUS[status] ?? ORDER_STATUS_LABELS[status] ?? status;
}

/** Status tampilan pelanggan — produksi hanya setelah kasir konfirmasi terima cucian & bayar. */
export function getEffectiveCustomerOrderStatus(
  status: string,
  paymentStatus: string,
  customerPaymentMode?: string | null
): string {
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'ON_HOLD') return 'ON_HOLD';
  if (paymentStatus !== 'PAID' && customerPaymentMode !== 'PAY_LATER') return 'ON_HOLD';
  return status;
}

export function isOrderInProduction(
  status: string,
  paymentStatus: string,
  customerPaymentMode?: string | null
): boolean {
  if (status === 'ON_HOLD' || status === 'CANCELLED') return false;
  if (paymentStatus === 'UNPAID' && customerPaymentMode !== 'PAY_LATER') return false;
  return (ORDER_STATUS_FLOW as readonly string[]).includes(status) || status === 'DELIVERED';
}

export const PRODUCTION_GATE_MESSAGE =
  'Pesanan harus dikonfirmasi kasir (cucian diterima & minimal DP diterima) sebelum masuk produksi';

export const ORDER_STATUS_FLOW = [
  'RECEIVED',
  'WASHING',
  'DRYING',
  'IRONING',
  'FOLDING',
  'READY',
  'PICKED_UP',
] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  BANK_TRANSFER: 'Transfer Bank',
  GOPAY: 'GoPay',
  SHOPEEPAY: 'ShopeePay',
  OVO: 'OVO',
  DANA: 'DANA',
};

export * from './roles';

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Owner',
  MANAGER: 'Manager',
  CASHIER: 'Kasir',
  WORKER: 'Pekerja',
  CUSTOMER: 'Pelanggan',
};

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatWeight(kg: number | string): string {
  const num = typeof kg === 'string' ? parseFloat(kg) : kg;
  return `${num.toFixed(2)} kg`;
}

export function generateOrderNumber(branchCode: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `${branchCode}-${dateStr}-${seq}`;
}

export {
  LOYALTY_POINTS_PER_KG,
  LOYALTY_APP_ORDER_BONUS,
  LOYALTY_REDEEM_COST,
  LOYALTY_REDEEM_FREE_KG,
  pointsFromWeightKg,
  canRedeemFreeKg,
  redemptionDiscount,
  kgNeededForRedemption,
} from './loyalty';

export {
  POS_SINGLE_PAYMENT_METHODS,
  SPLIT_PAYMENT_METHODS,
  PAYMENT_STATUS_LABELS,
  methodNeedsProof,
  computeCombinationPayment,
  formatPaymentSummary,
  computeRemainingBalance,
  type PosSinglePaymentMethod,
  type SplitPaymentMethod,
  type RemainingTiming,
  type CombinationPaymentInput,
  type CombinationPaymentPlan,
  type PaymentLineItem,
  type CustomerPaymentMode,
  type CustomerOrderPaymentInput,
  type TransferBankDetails,
  TRANSFER_BANK_DETAILS,
  CUSTOMER_PAYMENT_MODE_LABELS,
  isPayLaterCustomerPayment,
  canEnterProduction,
} from './payment';
