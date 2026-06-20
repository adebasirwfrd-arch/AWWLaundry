'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { reportClientError } from '@/lib/report-client-error';
import '@aww/design-tokens/css-variables.css';
import './globals.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
    reportClientError({
      error,
      component: 'app/global-error.tsx',
      boundary: 'global-error',
    });
  }, [error]);

  return (
    <html lang="id">
      <body className="flex min-h-dvh items-center justify-center bg-[#FAFAF8] p-6 font-sans antialiased">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-[#1E3A6E]">Terjadi kesalahan</h1>
          <p className="mt-2 text-sm text-[#1E3A6E]/60">
            Aplikasi mengalami masalah. Coba muat ulang halaman ini.
          </p>
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
