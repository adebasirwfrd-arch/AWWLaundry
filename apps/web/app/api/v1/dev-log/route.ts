import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { reportAwwError } from '@/lib/aww-dev-log';

function clientIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    undefined
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message : 'Unknown client error';
    const stack = typeof body.stack === 'string' ? body.stack : undefined;
    const name = typeof body.name === 'string' ? body.name : 'ClientError';

    const err = new Error(message);
    err.name = name;
    if (stack) err.stack = stack;

    const session = await auth().catch(() => null);

    await reportAwwError(err, {
      source: 'client',
      location: typeof body.location === 'string' ? body.location : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      routePath: typeof body.pathname === 'string' ? body.pathname : undefined,
      digest: typeof body.digest === 'string' ? body.digest : undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
      userId: session?.user?.id,
      userEmail: session?.user?.email ?? undefined,
      userRole: session?.user?.role as string | undefined,
      branchId: session?.user?.branchId,
      extra: {
        component: body.component ?? null,
        boundary: body.boundary ?? null,
        clientIp: clientIp(req),
        referer: req.headers.get('referer'),
        origin: req.headers.get('origin'),
        acceptLanguage: req.headers.get('accept-language'),
        contentType: req.headers.get('content-type'),
        ...(body.extra && typeof body.extra === 'object' ? body.extra : {}),
        rawPayload: body,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[AWW Dev Log API]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
