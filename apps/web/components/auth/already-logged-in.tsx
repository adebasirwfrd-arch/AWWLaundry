'use client';

import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { AuthCard } from '@/components/auth/auth-field';
import { ROLE_LABELS } from '@aww/shared';

interface AlreadyLoggedInProps {
  name: string;
  role: string;
  dashboardPath: string;
}

export function AlreadyLoggedIn({ name, role, dashboardPath }: AlreadyLoggedInProps) {
  return (
    <AuthCard>
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/brand/logo.png"
          alt="AWW Laundry"
          width={180}
          height={100}
          className="h-auto w-[min(180px,60vw)] object-contain"
        />
        <h1 className="mt-5 font-display text-2xl font-bold text-brand-navy">Anda sudah masuk</h1>
        <p className="mt-2 text-sm text-brand-navy/55">
          Browser masih menyimpan sesi login. Itulah mengapa <code className="text-xs">/login</code> langsung
          mengarah ke dashboard.
        </p>
      </div>

      <div className="rounded-xl border border-brand-navy/10 bg-brand-sky/10 p-4 text-center">
        <p className="font-semibold text-brand-navy">{name}</p>
        <p className="text-sm text-brand-navy/55">{ROLE_LABELS[role] ?? role}</p>
      </div>

      <div className="mt-5 space-y-3">
        <Link
          href={dashboardPath}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5B6CFF] text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,108,255,0.35)] hover:bg-[#4A5BEB]"
        >
          <LayoutDashboard className="h-4 w-4" />
          Lanjut ke Dashboard
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login?relogin=1' })}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand-navy/15 text-sm font-semibold text-brand-navy hover:bg-brand-navy/[0.03]"
        >
          <LogOut className="h-4 w-4" />
          Logout & ganti akun
        </button>
      </div>
    </AuthCard>
  );
}
