'use client';

type ClientErrorPayload = {
  error: Error & { digest?: string };
  component?: string;
  boundary?: 'error' | 'global-error';
  extra?: Record<string, unknown>;
};

export function reportClientError({ error, component, boundary, extra }: ClientErrorPayload) {
  const payload = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    digest: error.digest,
    location: component,
    component,
    boundary,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    extra,
  };

  void fetch('/api/v1/dev-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // ignore network errors while reporting errors
  });
}
