import { existsSync, readFileSync } from 'fs';
import path from 'path';

const ROOT_ENV_KEYS = new Set([
  'AUTH_GOOGLE_ID',
  'AUTH_GOOGLE_SECRET',
  'AUTH_SECRET',
  'AUTH_URL',
  'AUTH_TRUST_HOST',
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_SENDER_NAME',
  'CRON_SECRET',
  'APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
  'SUPABASE_PROJECT_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_STORAGE_BUCKET',
  'S3_BUCKET_NAME',
]);

function findMonoRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '../../..'),
  ];

  for (const dir of candidates) {
    if (!existsSync(path.join(dir, 'package.json'))) continue;
    try {
      const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) as { name?: string };
      if (pkg.name === 'aww-laundry') return dir;
    } catch {
      /* skip */
    }
  }

  return path.resolve(process.cwd(), '../..');
}

function loadEnvFile(envPath: string) {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    if (!ROOT_ENV_KEYS.has(key)) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, '');
    if (value) process.env[key] = value;
  }
}

const monoRoot = findMonoRoot();
loadEnvFile(path.join(monoRoot, '.env.local'));
loadEnvFile(path.join(monoRoot, '.env'));

export function getMonoRoot() {
  return monoRoot;
}
