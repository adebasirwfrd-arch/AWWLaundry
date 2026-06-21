'use client';

import { useEffect } from 'react';
import { isMobileAppWebView } from '@/lib/mobile-webview';
import { reportClientError } from '@/lib/report-client-error';

function reportWindowError(payload: {
  name: string;
  message: string;
  stack?: string;
  location?: string;
  component: string;
  extra?: Record<string, unknown>;
}) {
  const err = new Error(payload.message);
  err.name = payload.name;
  if (payload.stack) err.stack = payload.stack;

  reportClientError({
    error: err,
    component: payload.component,
    extra: {
      ...payload.extra,
      location: payload.location,
    },
  });
}

export function AwwDevLogBootstrap() {
  useEffect(() => {
    if (isMobileAppWebView()) {
      document.documentElement.classList.add('native-app');
      document.documentElement.setAttribute('data-native-app', 'awwlaundry');
      try {
        sessionStorage.setItem('aww-native-app', '1');
      } catch {
        // ignore
      }
    }

    const onError = (event: ErrorEvent) => {
      reportWindowError({
        name: event.error?.name ?? 'WindowError',
        message: event.message || 'Uncaught error',
        stack: event.error?.stack,
        location: `${event.filename ?? ''}:${event.lineno ?? ''}:${event.colno ?? ''}`,
        component: 'window.onerror',
        extra: { kind: 'window.error', colno: event.colno, lineno: event.lineno },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      reportWindowError({
        name: reason?.name ?? 'UnhandledRejection',
        message: reason?.message ?? String(reason ?? 'Unhandled promise rejection'),
        stack: reason?.stack,
        component: 'window.unhandledrejection',
        extra: {
          kind: 'unhandledrejection',
          reasonType: reason == null ? 'null' : typeof reason,
        },
      });
    };

    const originalConsoleError = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args);
      const errorArg = args.find((a) => a instanceof Error) as Error | undefined;
      const message = args
        .map((a) => {
          if (a instanceof Error) return `${a.name}: ${a.message}`;
          if (typeof a === 'string') return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(' ');

      if (errorArg || /error|exception|failed|rejected/i.test(message)) {
        reportWindowError({
          name: errorArg?.name ?? 'ConsoleError',
          message: errorArg?.message ?? message.slice(0, 2000),
          stack: errorArg?.stack,
          component: 'console.error',
          extra: {
            kind: 'console.error',
            argsPreview: message.slice(0, 4000),
          },
        });
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
