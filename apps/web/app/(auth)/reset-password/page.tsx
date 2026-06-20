import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-sm text-brand-navy/50">Memuat...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
