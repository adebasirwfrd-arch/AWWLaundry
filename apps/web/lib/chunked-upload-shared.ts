export type UploadCategory = 'expense-proof' | 'payment-proof';

export const UPLOAD_CATEGORY_DIRS: Record<UploadCategory, { dir: string; prefix: string }> = {
  'expense-proof': {
    dir: 'expense-proofs',
    prefix: 'expense',
  },
  'payment-proof': {
    dir: 'payment-proofs',
    prefix: 'proof',
  },
};
