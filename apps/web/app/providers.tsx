'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ClickBubbleBurst } from '@/components/animations/click-bubble-burst';
import { Toaster } from '@/components/ui/toaster';
import { createAppQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ClickBubbleBurst />
        <Toaster />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
