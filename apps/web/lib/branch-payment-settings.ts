import { TRANSFER_BANK_DETAILS, type TransferBankDetails } from '@aww/shared';
import type { QrisMerchantConfig } from '@/lib/qris-dynamic';

export interface BranchBankTransferSettings {
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
}

export interface BranchPaymentSettingsInput {
  qris?: Partial<QrisMerchantConfig>;
  bankTransfer?: Partial<BranchBankTransferSettings>;
}

export function parseBranchPaymentSettings(
  settingsRaw: string | null | undefined
): BranchPaymentSettingsInput {
  if (!settingsRaw) return {};
  try {
    const parsed = JSON.parse(settingsRaw) as BranchPaymentSettingsInput;
    return {
      qris: parsed.qris ?? {},
      bankTransfer: parsed.bankTransfer ?? {},
    };
  } catch {
    return {};
  }
}

export function resolveTransferBankDetails(
  settingsRaw?: string | null
): TransferBankDetails {
  const settings = parseBranchPaymentSettings(settingsRaw);
  const bt = settings.bankTransfer ?? {};

  return {
    bankName: bt.bankName?.trim() || TRANSFER_BANK_DETAILS.bankName,
    accountName: bt.accountName?.trim() || TRANSFER_BANK_DETAILS.accountName,
    accountNumber: bt.accountNumber?.trim() || TRANSFER_BANK_DETAILS.accountNumber,
  };
}

export function mergeBranchPaymentSettings(
  existingRaw: string,
  patch: BranchPaymentSettingsInput
): string {
  let base: Record<string, unknown> = {};
  try {
    base = existingRaw ? (JSON.parse(existingRaw) as Record<string, unknown>) : {};
  } catch {
    base = {};
  }

  const existing = parseBranchPaymentSettings(existingRaw);
  const merged = {
    ...base,
    qris: { ...existing.qris, ...patch.qris },
    bankTransfer: { ...existing.bankTransfer, ...patch.bankTransfer },
  };

  return JSON.stringify(merged);
}

export function buildBranchPaymentSettingsMap(
  branches: Array<{ id: string; settings: string }>
): Record<string, TransferBankDetails> {
  const map: Record<string, TransferBankDetails> = {};
  for (const branch of branches) {
    map[branch.id] = resolveTransferBankDetails(branch.settings);
  }
  return map;
}
