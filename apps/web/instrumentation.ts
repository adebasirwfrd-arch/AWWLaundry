export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installProcessErrorHandlers } = await import('@/lib/aww-dev-log');
    installProcessErrorHandlers();
  }
}

export async function onRequestError(
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] | undefined };
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routePath: string;
    routeType: 'render' | 'route' | 'action' | 'middleware' | 'proxy';
  }
) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { reportAwwError } = await import('@/lib/aww-dev-log');

  const source =
    context.routeType === 'action'
      ? 'server-action'
      : context.routeType === 'route'
        ? 'api'
        : context.routeType === 'middleware'
          ? 'middleware'
          : 'render';

  await reportAwwError(err, {
    source,
    routePath: context.routePath,
    routeType: context.routeType,
    url: request.path,
    method: request.method,
    digest: err.digest,
    location: context.routePath,
    userAgent: String(request.headers['user-agent'] ?? ''),
    extra: {
      routerKind: context.routerKind,
      referer: request.headers.referer ?? null,
    },
  });
}
