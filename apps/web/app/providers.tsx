'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ClickBubbleBurst } from '@/components/animations/click-bubble-burst';
import { NativeAppBootstrap } from '@/components/native-app-bootstrap';
import { NativeViewportSync } from '@/components/native-viewport-sync';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { createAppQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <SessionProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <NativeAppBootstrap />
          <NativeViewportSync />
          <ClickBubbleBurst />
          <Toaster />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
