import { readFileSync, existsSync } from 'fs';
import path from 'path';

const webRoot = path.resolve(__dirname, '..');
const monoRoot = path.resolve(__dirname, '../../..');

const OVERRIDE_KEYS = new Set([
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_SENDER_NAME',
  'CRON_SECRET',
  'APP_URL',
  'NEXT_PUBLIC_APP_URL',
]);

function loadEnvFile(envPath: string, onlyKeys?: Set<string>) {
  if (!existsSync(envPath)) return;
  try {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      if (onlyKeys && !onlyKeys.has(key)) continue;
      if (!onlyKeys && process.env[key]) continue;
      process.env[key] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    /* skip */
  }
}

// apps/web/.env dulu (SQLite lokal)
loadEnvFile(path.join(webRoot, '.env'));
// Root secrets (Brevo, cron) — jangan timpa DATABASE_URL
loadEnvFile(path.join(monoRoot, '.env.local'), OVERRIDE_KEYS);
loadEnvFile(path.join(webRoot, '.env.local'), OVERRIDE_KEYS);
