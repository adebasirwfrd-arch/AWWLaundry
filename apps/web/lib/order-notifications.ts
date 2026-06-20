import { getCustomerLaundryStatus } from '@aww/shared';
import {
  buildOrderCreatedMessage,
  buildOrderReadyMessage,
  buildOrderStatusMessage,
  sendWhatsApp,
} from '@/lib/whatsapp';

const NOTIFY_STATUSES = new Set(['RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'FOLDING', 'READY', 'PICKED_UP']);

export async function notifyCustomerOrderCreated(params: {
  phone: string;
  customerName: string;
  orderNumber: string;
  serviceName: string;
  weightKg: number;
  total: number;
  branchName: string;
  estimatedReadyAt?: Date | string | null;
  paid: boolean;
}) {
  const message = buildOrderCreatedMessage(params);
  return sendWhatsApp({ phone: params.phone, message });
}

export async function notifyCustomerOrderStatus(params: {
  phone: string;
  customerName: string;
  orderNumber: string;
  newStatus: string;
  branchName: string;
  branchPhone?: string | null;
}) {
  if (!NOTIFY_STATUSES.has(params.newStatus)) return { ok: true };

  const statusLabel = getCustomerLaundryStatus(params.newStatus);
  const message =
    params.newStatus === 'READY'
      ? buildOrderReadyMessage({
          orderNumber: params.orderNumber,
          customerName: params.customerName,
          branchName: params.branchName,
          branchPhone: params.branchPhone,
        })
      : buildOrderStatusMessage({
          orderNumber: params.orderNumber,
          customerName: params.customerName,
          statusLabel,
          branchName: params.branchName,
        });

  return sendWhatsApp({ phone: params.phone, message });
}
