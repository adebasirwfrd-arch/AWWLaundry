'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import { resetPassword } from '@/app/actions/auth';
import { AuthCard, AuthField } from '@/components/auth/auth-field';

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ email, token, password });
      router.push('/login?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal reset password');
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <AuthCard>
        <p className="text-center text-sm text-red-600">Link reset tidak valid.</p>
        <Link href="/forgot-password" className="mt-4 block text-center text-sm text-[#4A90D9] hover:underline">
          Minta link baru
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/brand/logo.png" alt="AWW Laundry" width={160} height={90} className="h-auto w-[min(160px,60vw)] object-contain" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-brand-navy">Password Baru</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Password Baru" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} icon={<Lock className="h-5 w-5" />} />
        <AuthField label="Konfirmasi" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required icon={<Lock className="h-5 w-5" />} />
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#5B6CFF] font-semibold text-white hover:bg-[#4A5BEB] disabled:opacity-60">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Simpan Password'}
        </button>
      </form>
    </AuthCard>
  );
}
