'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase tidak dikonfigurasi — set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  browserClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return browserClient;
}

export function isSupabaseBrowserConfigured() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
