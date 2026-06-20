import '@/lib/load-root-env';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { AlreadyLoggedIn } from '@/components/auth/already-logged-in';
import { auth, getDashboardPath } from '@/lib/auth';
import { isGoogleAuthConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ relogin?: string }>;
}) {
  const session = await auth();
  const { relogin } = await searchParams;

  if (session?.user && relogin !== '1') {
    return (
      <AlreadyLoggedIn
        name={session.user.name ?? session.user.email ?? 'Pengguna'}
        role={String(session.user.role)}
        dashboardPath={getDashboardPath(session.user.role)}
      />
    );
  }

  return (
    <Suspense>
      <LoginForm
        appName={process.env.NEXT_PUBLIC_APP_NAME ?? 'AWW Laundry'}
        googleEnabled={isGoogleAuthConfigured()}
      />
    </Suspense>
  );
}
