export const UPLOAD_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per batch — aman untuk server action / API

export type UploadCategory = 'expense-proof' | 'payment-proof';

export const UPLOAD_CATEGORY_DIRS: Record<UploadCategory, { dir: string; urlPrefix: string; prefix: string }> = {
  'expense-proof': {
    dir: 'expense-proofs',
    urlPrefix: '/uploads/expense-proofs',
    prefix: 'expense',
  },
  'payment-proof': {
    dir: 'payment-proofs',
    urlPrefix: '/uploads/payment-proofs',
    prefix: 'proof',
  },
};
