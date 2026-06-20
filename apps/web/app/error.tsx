'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="id">
      <body className="flex min-h-dvh items-center justify-center bg-[#FAFAF8] p-6 font-sans">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-aww-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-brand-navy">Terjadi kesalahan</h1>
          <p className="mt-2 text-sm text-brand-navy/55">
            Aplikasi mengalami masalah. Coba muat ulang halaman ini.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-3 rounded-lg bg-brand-navy/5 p-2 font-mono text-xs text-brand-navy/60">
              {error.message}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#5B6CFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4A5BEB]"
          >
            <RotateCcw className="h-4 w-4" />
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
