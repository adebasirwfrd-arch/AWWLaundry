import '@/lib/load-root-env';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { isGoogleAuthConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  return (
    <Suspense>
      <LoginForm
        appName={process.env.NEXT_PUBLIC_APP_NAME ?? 'AWW Laundry'}
        googleEnabled={isGoogleAuthConfigured()}
      />
    </Suspense>
  );
}
