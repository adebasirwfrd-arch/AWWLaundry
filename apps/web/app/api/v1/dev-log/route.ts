import { NextResponse } from 'next/server';
import { reportAwwError } from '@/lib/aww-dev-log';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message : 'Unknown client error';
    const stack = typeof body.stack === 'string' ? body.stack : undefined;
    const name = typeof body.name === 'string' ? body.name : 'ClientError';

    const err = new Error(message);
    err.name = name;
    if (stack) err.stack = stack;

    await reportAwwError(err, {
      source: 'client',
      location: typeof body.location === 'string' ? body.location : undefined,
      url: typeof body.url === 'string' ? body.url : undefined,
      routePath: typeof body.pathname === 'string' ? body.pathname : undefined,
      digest: typeof body.digest === 'string' ? body.digest : undefined,
      userAgent: req.headers.get('user-agent') ?? undefined,
      extra: {
        component: body.component ?? null,
        boundary: body.boundary ?? null,
        ...((body.extra && typeof body.extra === 'object') ? body.extra : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[AWW Dev Log API]', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
