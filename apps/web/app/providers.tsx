'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ClickBubbleBurst } from '@/components/animations/click-bubble-burst';
import { AwwDevLogBootstrap } from '@/components/aww-dev-log-bootstrap';
import { NativeOverlayGuard } from '@/components/native-overlay-guard';
import { NativeViewportSync } from '@/components/native-viewport-sync';
import { WebScrollEnhancer } from '@/components/web-scroll-enhancer';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { useNativeLiteUI } from '@/hooks/use-native-lite-ui';
import { createAppQueryClient } from '@/lib/query-client';

function AppEffects() {
  const lite = useNativeLiteUI();
  return (
    <>
      {lite && <NativeOverlayGuard />}
      <ClickBubbleBurst />
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <SessionProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AwwDevLogBootstrap />
          <NativeViewportSync />
          <WebScrollEnhancer />
          <AppEffects />
          <Toaster />
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
