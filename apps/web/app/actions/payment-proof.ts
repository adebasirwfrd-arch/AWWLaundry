'use server';

import { requireAuth } from '@/lib/session';
import { storeUploadedFile } from '@/lib/object-storage';
import { Role } from '@aww/database';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const STAFF = [Role.CASHIER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN];

async function saveProofFile(file: File, prefix: string) {
  const mime = file.type || 'image/jpeg';
  if (!mime.startsWith('image/') && !ALLOWED_TYPES.has(mime)) {
    throw new Error('Format foto harus JPG, PNG, atau WebP');
  }

  const ext =
    mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  return { fileName, bytes, mime };
}

export async function uploadPaymentProof(formData: FormData): Promise<string> {
  await requireAuth(STAFF);

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('Foto bukti pembayaran tidak ditemukan');

  const { fileName, bytes, mime } = await saveProofFile(file, 'proof');
  return storeUploadedFile({ folder: 'payment-proofs', fileName, bytes, mime });
}

export async function uploadExpenseProof(formData: FormData): Promise<string> {
  await requireAuth(STAFF);

  const file = formData.get('file') as File | null;
  if (!file) throw new Error('Foto bukti pembayaran tidak ditemukan');

  const { fileName, bytes, mime } = await saveProofFile(file, 'expense');
  return storeUploadedFile({ folder: 'expense-proofs', fileName, bytes, mime });
}
