'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Mail, Lock, User, Loader2 } from 'lucide-react';
import { registerCustomer } from '@/app/actions/auth';
import { AuthCard, AuthDivider, AuthField } from '@/components/auth/auth-field';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

interface RegisterFormProps {
  appName: string;
  googleEnabled: boolean;
}

export function RegisterForm({ appName, googleEnabled }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    setLoading(true);
    try {
      await registerCustomer({ name, email, password });
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        router.push('/login?registered=1');
        return;
      }
      router.push('/customer');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/brand/logo.png" alt="AWW Laundry" width={180} height={100} className="h-auto w-[min(180px,65vw)] object-contain" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-brand-navy">Buat Akun</h1>
        <p className="mt-2 text-sm text-brand-navy/50">Daftar {appName} untuk pesan & lacak cucian</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Nama" value={name} onChange={(e) => setName(e.target.value)} required icon={<User className="h-5 w-5" />} />
        <AuthField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required icon={<Mail className="h-5 w-5" />} />
        <AuthField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} icon={<Lock className="h-5 w-5" />} />
        <AuthField label="Konfirmasi Password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required icon={<Lock className="h-5 w-5" />} />

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B6CFF] font-semibold text-white shadow-[0_4px_14px_rgba(91,108,255,0.35)] hover:bg-[#4A5BEB] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Daftar'}
        </button>
      </form>

      {googleEnabled && (
        <>
          <AuthDivider label="Atau" />
          <GoogleSignInButton callbackUrl="/customer" label="Daftar dengan Google" />
          <p className="mt-3 text-center text-xs text-brand-navy/45">
            Akun Google baru otomatis terdaftar sebagai pelanggan.
          </p>
        </>
      )}

      <p className="mt-8 text-center text-sm text-brand-navy/55">
        Sudah punya akun?{' '}
        <Link href="/login" className="font-semibold text-[#4A90D9] hover:underline">
          Masuk
        </Link>
      </p>
    </AuthCard>
  );
}
