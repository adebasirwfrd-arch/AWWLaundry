'use client';

import { useEffect } from 'react';
import { isMobileAppWebView } from '@/lib/mobile-webview';

function reportNativeError(payload: Record<string, unknown>) {
  void fetch('/api/v1/dev-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    }),
    keepalive: true,
  }).catch(() => {
    // ignore network errors while reporting
  });
}

export function NativeAppBootstrap() {
  useEffect(() => {
    if (!isMobileAppWebView()) return;
    document.documentElement.classList.add('native-app');
    document.documentElement.setAttribute('data-native-app', 'awwlaundry');
    try {
      sessionStorage.setItem('aww-native-app', '1');
    } catch {
      // ignore storage errors
    }

    const onError = (event: ErrorEvent) => {
      reportNativeError({
        name: event.error?.name ?? 'NativeAppError',
        message: event.message || 'Uncaught error in native app',
        stack: event.error?.stack,
        location: `${event.filename ?? ''}:${event.lineno ?? ''}:${event.colno ?? ''}`,
        component: 'native-app',
        extra: { kind: 'window.error' },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportNativeError({
        name: reason?.name ?? 'UnhandledRejection',
        message: reason?.message ?? String(reason ?? 'Unhandled promise rejection'),
        stack: reason?.stack,
        component: 'native-app',
        extra: { kind: 'unhandledrejection' },
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
