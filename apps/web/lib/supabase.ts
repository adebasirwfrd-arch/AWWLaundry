import '@/lib/load-root-env';
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase tidak dikonfigurasi — set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getSupabaseStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET ?? process.env.S3_BUCKET_NAME ?? 'aww-laundry';
}
