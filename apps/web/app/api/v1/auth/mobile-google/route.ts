import { signIn } from '@/lib/auth';
import { isGoogleAuthConfigured } from '@/lib/env';
import { safeCallbackUrl } from '@/lib/callback-url';

export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return new Response('Google login is not configured', { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'), '/customer');

  return signIn('google', { redirectTo: callbackUrl });
}
