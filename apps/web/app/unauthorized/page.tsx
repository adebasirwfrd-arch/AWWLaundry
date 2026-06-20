import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { auth, getDashboardPath } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function UnauthorizedPage() {
  const session = await auth();
  const role = session?.user?.role;
  const dashboardPath = role ? getDashboardPath(role) : '/login';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#FAFAF8] p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-aww-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="font-display text-xl font-bold text-brand-navy">Akses tidak diizinkan</h1>
        <p className="mt-2 text-sm text-brand-navy/55">
          Halaman ini tidak tersedia untuk akun Anda
          {role ? ` (${String(role).toLowerCase()})` : ''}. Kembali ke halaman utama Anda.
        </p>
        <Link
          href={dashboardPath}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#5B6CFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4A5BEB]"
        >
          Ke halaman utama
        </Link>
      </div>
    </div>
  );
}
