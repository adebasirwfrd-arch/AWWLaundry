import { getAppUrl } from '@/lib/env';

export type WhatsAppProvider = 'fonnte' | 'wablas' | 'none';

export function getWhatsAppProvider(): WhatsAppProvider {
  if (process.env.FONNTE_API_KEY && !process.env.FONNTE_API_KEY.startsWith('your_')) {
    return 'fonnte';
  }
  if (process.env.WABLAS_API_KEY && !process.env.WABLAS_API_KEY.startsWith('your_')) {
    return 'wablas';
  }
  return 'none';
}

export function isWhatsAppConfigured() {
  return getWhatsAppProvider() !== 'none';
}

/** Normalize Indonesian phone to 62xxx format. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export interface SendWhatsAppParams {
  phone: string;
  message: string;
}

export async function sendWhatsApp(params: SendWhatsAppParams): Promise<{ ok: boolean; error?: string }> {
  const provider = getWhatsAppProvider();
  const target = normalizePhone(params.phone);
  if (!target || target.length < 10) {
    return { ok: false, error: 'Nomor telepon tidak valid' };
  }

  if (provider === 'fonnte') {
    return sendViaFonnte(target, params.message);
  }
  if (provider === 'wablas') {
    return sendViaWablas(target, params.message);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[WhatsApp mock]', target, params.message);
    return { ok: true };
  }
  return { ok: false, error: 'WhatsApp belum dikonfigurasi' };
}

async function sendViaFonnte(target: string, message: string) {
  const token = process.env.FONNTE_API_KEY!;
  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target, message, countryCode: '62' }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: boolean; reason?: string };
  if (!res.ok || data.status === false) {
    return { ok: false, error: data.reason ?? `Fonnte error ${res.status}` };
  }
  return { ok: true };
}

async function sendViaWablas(target: string, message: string) {
  const token = process.env.WABLAS_API_KEY!;
  const base = process.env.WABLAS_BASE_URL ?? 'https://pati.wablas.com';
  const res = await fetch(`${base}/api/send-message`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone: target, message }),
  });
  const data = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string };
  if (!res.ok || data.status === false) {
    return { ok: false, error: data.message ?? `Wablas error ${res.status}` };
  }
  return { ok: true };
}

export function buildOrderCreatedMessage(params: {
  orderNumber: string;
  customerName: string;
  serviceName: string;
  weightKg: number;
  total: number;
  branchName: string;
  estimatedReadyAt?: Date | string | null;
  paid: boolean;
}) {
  const ready = params.estimatedReadyAt
    ? new Date(params.estimatedReadyAt).toLocaleString('id-ID')
    : '-';
  const trackUrl = `${getAppUrl()}/track?order=${params.orderNumber}`;
  return (
    `🧺 *AWW Laundry — ${params.branchName}*\n\n` +
    `Halo ${params.customerName},\n` +
    `Pesanan *${params.orderNumber}* telah diterima.\n\n` +
    `📦 Layanan: ${params.serviceName}\n` +
    `⚖️ Berat: ${params.weightKg} kg\n` +
    `💰 Total: Rp ${params.total.toLocaleString('id-ID')}\n` +
    `💳 Status: ${params.paid ? 'LUNAS' : 'Belum bayar'}\n` +
    `⏰ Estimasi selesai: ${ready}\n\n` +
    `Lacak status cucian:\n${trackUrl}\n\n` +
    `Terima kasih! 🙏`
  );
}

export function buildOrderStatusMessage(params: {
  orderNumber: string;
  customerName: string;
  statusLabel: string;
  branchName: string;
}) {
  const trackUrl = `${getAppUrl()}/track?order=${params.orderNumber}`;
  return (
    `🧺 *AWW Laundry — ${params.branchName}*\n\n` +
    `Halo ${params.customerName},\n` +
    `Update pesanan *${params.orderNumber}*:\n\n` +
    `📍 Status: *${params.statusLabel}*\n\n` +
    `Lacak: ${trackUrl}`
  );
}

export function buildOrderReadyMessage(params: {
  orderNumber: string;
  customerName: string;
  branchName: string;
  branchPhone?: string | null;
}) {
  const trackUrl = `${getAppUrl()}/track?order=${params.orderNumber}`;
  return (
    `✅ *AWW Laundry — ${params.branchName}*\n\n` +
    `Halo ${params.customerName},\n` +
    `Cucian *${params.orderNumber}* sudah *SIAP DIAMBIL*! 🎉\n\n` +
    (params.branchPhone ? `📞 ${params.branchPhone}\n\n` : '') +
    `Lacak: ${trackUrl}`
  );
}
