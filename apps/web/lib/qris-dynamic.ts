/**
 * Dynamic QRIS payload generator (EMV QR Code — Indonesia QRIS standard).
 * Amount & reference change per transaction so scanned QR matches the bill.
 */

export interface QrisMerchantConfig {
  merchantPan: string;
  merchantName: string;
  merchantCity: string;
  nmid?: string;
  mcc?: string;
}

export interface GenerateQrisInput {
  amount: number;
  reference: string;
  merchant: QrisMerchantConfig;
}

function tlv(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function sanitizeName(value: string, max: number): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .slice(0, max);
}

function formatAmount(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded <= 0) throw new Error('Jumlah QRIS harus lebih dari 0');
  return rounded.toString();
}

/** Build merchant account info sub-TLV for QRIS (tag 26). */
function buildMerchantAccountInfo(merchant: QrisMerchantConfig): string {
  const gui = tlv('00', 'ID.CO.QRIS.WWW');
  const pan = tlv('01', merchant.merchantPan.replace(/\D/g, ''));
  const parts = [gui, pan];
  if (merchant.nmid) {
    parts.push(tlv('02', merchant.nmid.slice(0, 15)));
  }
  return tlv('26', parts.join(''));
}

/**
 * Generate a dynamic QRIS string with exact transaction amount.
 * Tag 01 = 12 (dynamic), tag 54 = transaction amount, tag 62.01 = bill reference.
 */
export function generateDynamicQrisPayload(input: GenerateQrisInput): string {
  const { amount, reference, merchant } = input;
  const amountStr = formatAmount(amount);
  const billRef = reference.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 25);

  const merchantName = sanitizeName(merchant.merchantName, 25) || 'AWW LAUNDRY';
  const merchantCity = sanitizeName(merchant.merchantCity, 15) || 'JAKARTA';
  const mcc = merchant.mcc ?? '0000';

  const additionalData = tlv('62', tlv('01', billRef || 'AWW'));

  const payloadWithoutCrc = [
    tlv('00', '01'),
    tlv('01', '12'),
    buildMerchantAccountInfo(merchant),
    tlv('52', mcc),
    tlv('53', '360'),
    tlv('54', amountStr),
    tlv('58', 'ID'),
    tlv('59', merchantName),
    tlv('60', merchantCity),
    additionalData,
    '6304',
  ].join('');

  return payloadWithoutCrc + crc16Ccitt(payloadWithoutCrc);
}

export function getQrisMerchantConfigFromEnv(): QrisMerchantConfig | null {
  const merchantPan = process.env.QRIS_MERCHANT_PAN?.trim();
  if (!merchantPan) return null;

  return {
    merchantPan,
    merchantName: process.env.QRIS_MERCHANT_NAME?.trim() || 'AWW LAUNDRY',
    merchantCity: process.env.QRIS_MERCHANT_CITY?.trim() || 'JAKARTA',
    nmid: process.env.QRIS_NMID?.trim(),
    mcc: process.env.QRIS_MCC?.trim() || '0000',
  };
}

export function parseBranchQrisSettings(settingsRaw: string | null | undefined): Partial<QrisMerchantConfig> {
  if (!settingsRaw) return {};
  try {
    const parsed = JSON.parse(settingsRaw) as { qris?: Partial<QrisMerchantConfig> };
    return parsed.qris ?? {};
  } catch {
    return {};
  }
}

export function resolveQrisMerchantConfig(
  branchSettings?: string | null
): QrisMerchantConfig | null {
  const fromEnv = getQrisMerchantConfigFromEnv();
  const fromBranch = parseBranchQrisSettings(branchSettings);

  const merchantPan = fromBranch.merchantPan ?? fromEnv?.merchantPan;
  if (!merchantPan) return null;

  return {
    merchantPan,
    merchantName: fromBranch.merchantName ?? fromEnv?.merchantName ?? 'AWW LAUNDRY',
    merchantCity: fromBranch.merchantCity ?? fromEnv?.merchantCity ?? 'JAKARTA',
    nmid: fromBranch.nmid ?? fromEnv?.nmid,
    mcc: fromBranch.mcc ?? fromEnv?.mcc ?? '0000',
  };
}
