'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { AuthCard, AuthDivider, AuthField } from '@/components/auth/auth-field';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { safeCallbackUrl } from '@/lib/callback-url';

interface LoginFormProps {
  appName: string;
  googleEnabled: boolean;
}

function oauthErrorMessage(code: string | null) {
  switch (code) {
    case 'OAuthSignin':
    case 'OAuthCallback':
      return 'Gagal masuk dengan Google. Silakan coba lagi.';
    case 'OAuthAccountNotLinked':
      return 'Email ini sudah terdaftar dengan metode lain. Gunakan email & password.';
    case 'AccessDenied':
      return 'Akses ditolak. Pastikan akun Google Anda diizinkan.';
    case 'Configuration':
      return 'Login Google belum dikonfigurasi. Hubungi admin.';
    default:
      return code ? 'Gagal masuk. Silakan coba lagi.' : '';
  }
}

export function LoginForm({ appName, googleEnabled }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));

  useEffect(() => {
    const oauthError = oauthErrorMessage(searchParams.get('error'));
    if (oauthError) setError(oauthError);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError('Email atau password salah');
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <AuthCard>
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/brand/logo.png"
          alt="AWW Laundry"
          width={200}
          height={110}
          priority
          className="h-auto w-[min(200px,70vw)] object-contain"
        />
        <h1 className="mt-6 font-display text-3xl font-extrabold text-brand-navy">Selamat Datang</h1>
        <p className="mt-2 text-sm text-brand-navy/50">
          Masuk ke dashboard {appName} Anda
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Email"
          type="email"
          placeholder="nama@awwlaundry.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          icon={<Mail className="h-5 w-5" />}
        />

        <AuthField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          icon={<Lock className="h-5 w-5" />}
          rightSlot={
            <Link href="/forgot-password" className="text-xs font-medium text-[#4A90D9] hover:underline">
              Lupa password?
            </Link>
          }
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="flex h-8 w-8 items-center justify-center text-brand-navy/35 hover:text-brand-navy"
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B6CFF] text-base font-semibold text-white shadow-[0_4px_14px_rgba(91,108,255,0.35)] transition-all hover:bg-[#4A5BEB] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Memproses...
            </>
          ) : (
            'Masuk ke Dashboard'
          )}
        </button>
      </form>

      {googleEnabled && (
        <>
          <AuthDivider label="Atau" />
          <GoogleSignInButton callbackUrl={callbackUrl} label="Masuk dengan Google" />
          <p className="mt-3 text-center text-xs text-brand-navy/45">
            Belum punya akun? Google akan otomatis membuat akun baru.
          </p>
        </>
      )}

      {!googleEnabled && process.env.NODE_ENV === 'development' && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Google login nonaktif — set <code className="font-mono">AUTH_GOOGLE_ID</code> dan{' '}
          <code className="font-mono">AUTH_GOOGLE_SECRET</code> di <code className="font-mono">.env.local</code>{' '}
          lalu restart dev server.
        </p>
      )}

      <p className="mt-8 text-center text-sm text-brand-navy/55">
        Belum punya akun?{' '}
        <Link href="/register" className="font-semibold text-[#4A90D9] hover:underline">
          Daftar sekarang
        </Link>
      </p>

      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 rounded-xl border border-dashed border-brand-navy/15 bg-brand-navy/[0.02] p-3 text-xs text-brand-navy/50">
          <summary className="cursor-pointer font-medium text-brand-navy/60">Akun demo (dev)</summary>
          <ul className="mt-2 space-y-1 font-mono">
            <li>owner@awwlaundry.com</li>
            <li>kasir@awwlaundry.com</li>
            <li>worker@awwlaundry.com</li>
            <li>pelanggan@awwlaundry.com</li>
            <li className="text-brand-navy/40">password: password123</li>
          </ul>
        </details>
      )}
    </AuthCard>
  );
}
