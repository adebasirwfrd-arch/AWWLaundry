'use client';

type ClientErrorPayload = {
  error: Error & { digest?: string };
  component?: string;
  boundary?: 'error' | 'global-error';
  extra?: Record<string, unknown>;
};

function collectClientDiagnostics() {
  if (typeof window === 'undefined') return {};

  const nav = window.navigator;
  return {
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    url: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    referrer: document.referrer || null,
    userAgent: nav.userAgent,
    language: nav.language,
    platform: nav.platform,
    online: nav.onLine,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio,
    },
    screen: {
      width: window.screen?.width,
      height: window.screen?.height,
    },
    nativeApp: document.documentElement.classList.contains('native-app'),
  };
}

export function reportClientError({ error, component, boundary, extra }: ClientErrorPayload) {
  const diagnostics = collectClientDiagnostics();

  void fetch('/api/v1/dev-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      location: component,
      component,
      boundary,
      url: diagnostics.url,
      pathname: diagnostics.pathname,
      extra: {
        ...diagnostics,
        ...extra,
      },
    }),
    keepalive: true,
  }).catch(() => {
    // ignore network errors while reporting errors
  });
}
