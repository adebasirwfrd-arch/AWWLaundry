'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions/auth';
import { AuthCard, AuthField } from '@/components/auth/auth-field';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/brand/logo.png" alt="AWW Laundry" width={160} height={90} className="h-auto w-[min(160px,60vw)] object-contain" />
        <h1 className="mt-6 font-display text-2xl font-extrabold text-brand-navy">Lupa Password</h1>
        <p className="mt-2 text-sm text-brand-navy/50">Kami kirim link reset ke email Anda</p>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-rainbow-green" />
          <p className="text-sm text-brand-navy/70">
            Jika email terdaftar, link reset sudah dikirim ke <strong>{email}</strong>.
          </p>
          <Link href="/login" className="mt-2 text-sm font-semibold text-[#4A90D9] hover:underline">
            Kembali ke login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail className="h-5 w-5" />}
          />
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#5B6CFF] font-semibold text-white hover:bg-[#4A5BEB] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Kirim Link Reset'}
          </button>
          <p className="text-center text-sm">
            <Link href="/login" className="text-[#4A90D9] hover:underline">
              Kembali ke login
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
