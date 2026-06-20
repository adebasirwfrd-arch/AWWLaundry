import '@/lib/load-root-env';
import { NextResponse } from 'next/server';
import { prisma } from '@aww/database';
import {
  isBrevoConfigured,
  isGoogleAuthConfigured,
  isOpenAIConfigured,
  isSupabaseConfigured,
  isSupabaseStorageConfigured,
  getAppUrl,
} from '@/lib/env';
import { verifySupabaseStorage } from '@/lib/object-storage';

export async function GET() {
  const checks: Record<string, { ok: boolean; note?: string }> = {
    app: { ok: true, note: getAppUrl() },
    database: { ok: false },
    authSecret: { ok: !!process.env.AUTH_SECRET },
    googleOAuth: { ok: isGoogleAuthConfigured() },
    brevo: { ok: isBrevoConfigured() },
    openai: { ok: isOpenAIConfigured() },
    supabase: {
      ok: isSupabaseConfigured(),
      note: process.env.SUPABASE_PROJECT_ID,
    },
    midtrans: {
      ok: !!(process.env.MIDTRANS_SERVER_KEY && !process.env.MIDTRANS_SERVER_KEY.includes('DUMMY')),
    },
    redis: {
      ok: !!(process.env.REDIS_URL && !process.env.REDIS_URL.includes('DUMMY')),
    },
    storage: { ok: false, note: 'checking...' },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true };
  } catch (e) {
    checks.database = { ok: false, note: e instanceof Error ? e.message : 'DB error' };
  }

  if (isSupabaseStorageConfigured()) {
    const storageCheck = await verifySupabaseStorage();
    checks.storage = storageCheck;
  } else {
    checks.storage = {
      ok: false,
      note: 'Supabase Storage wajib — set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET',
    };
  }

  const phase1 = checks.database.ok && checks.authSecret.ok;
  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    status: allOk ? 'ok' : phase1 ? 'degraded' : 'error',
    phase: {
      mvp: phase1 && checks.googleOAuth.ok && checks.brevo.ok,
      ai: checks.openai.ok,
      payments: checks.midtrans.ok,
      realtime: checks.redis.ok,
      storage: checks.storage.ok,
    },
    checks,
    timestamp: new Date().toISOString(),
  });
}
