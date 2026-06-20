import '@/lib/load-root-env';
import { RegisterForm } from '@/components/auth/register-form';
import { isGoogleAuthConfigured } from '@/lib/env';

export default async function RegisterPage() {
  return (
    <RegisterForm
      appName={process.env.NEXT_PUBLIC_APP_NAME ?? 'AWW Laundry'}
      googleEnabled={isGoogleAuthConfigured()}
    />
  );
}
