import 'server-only';

import { sendDevErrorEmail } from '@/lib/brevo';
import { getAppUrl, getOwnerNotificationEmail } from '@/lib/env';

export type AwwErrorSource =
  | 'client'
  | 'server'
  | 'api'
  | 'cron'
  | 'server-action'
  | 'render'
  | 'route'
  | 'middleware'
  | 'uncaught'
  | 'unhandled-rejection';

export interface AwwErrorContext {
  source: AwwErrorSource;
  location?: string;
  routePath?: string;
  routeType?: string;
  url?: string;
  method?: string;
  digest?: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  branchId?: string;
  userAgent?: string;
  environment?: string;
  extra?: Record<string, unknown>;
}

const DEDUP_MS = 10 * 60 * 1000;
const recentFingerprints = new Map<string, number>();

function normalizeError(error: unknown): {
  name: string;
  message: string;
  stack?: string;
  cause?: string;
} {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error
        ? `${error.cause.name}: ${error.cause.message}`
        : error.cause != null
          ? String(error.cause)
          : undefined;
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause,
    };
  }
  return { name: 'UnknownError', message: String(error) };
}

function hashKey(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (Math.imul(31, hash) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function fingerprint(error: ReturnType<typeof normalizeError>, context: AwwErrorContext) {
  const key = [
    context.source,
    context.routePath ?? context.location ?? context.url ?? '',
    error.name,
    error.message,
    parsePrimaryStackFrame(error.stack ?? ''),
  ].join('|');
  return hashKey(key);
}

function parsePrimaryStackFrame(stack: string): string {
  const lines = stack.split('\n').map((l) => l.trim()).filter(Boolean);
  const appFrame = lines.find(
    (l) =>
      l.includes('/apps/web/') ||
      l.includes('\\apps\\web\\') ||
      (l.startsWith('at ') && !l.includes('node_modules'))
  );
  return appFrame ?? lines[1] ?? lines[0] ?? '';
}

function parseStackFrames(stack?: string): string[] {
  if (!stack) return [];
  return stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at '))
    .slice(0, 12);
}

function shouldSend(fp: string): boolean {
  const now = Date.now();
  const last = recentFingerprints.get(fp);
  if (last && now - last < DEDUP_MS) return false;
  recentFingerprints.set(fp, now);
  if (recentFingerprints.size > 200) {
    for (const [k, t] of recentFingerprints) {
      if (now - t > DEDUP_MS) recentFingerprints.delete(k);
    }
  }
  return true;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDevErrorEmailHtml(input: {
  error: ReturnType<typeof normalizeError>;
  context: AwwErrorContext;
  stackFrames: string[];
  primaryFrame: string;
  reportedAt: Date;
}) {
  const { error, context, stackFrames, primaryFrame, reportedAt } = input;
  const wib = reportedAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const appUrl = getAppUrl();

  const rows: Array<[string, string]> = [
    ['Waktu (WIB)', wib],
    ['Environment', context.environment ?? process.env.NODE_ENV ?? 'unknown'],
    ['Sumber Error', context.source],
    ['Lokasi Utama', primaryFrame || context.location || '—'],
    ['Route Path', context.routePath ?? '—'],
    ['Tipe Route', context.routeType ?? '—'],
    ['URL', context.url ?? '—'],
    ['HTTP Method', context.method ?? '—'],
    ['Digest', context.digest ?? '—'],
    ['User ID', context.userId ?? '—'],
    ['User Email', context.userEmail ?? '—'],
    ['Role', context.userRole ?? '—'],
    ['Branch ID', context.branchId ?? '—'],
    ['User Agent', context.userAgent ?? '—'],
    ['App URL', appUrl],
    ['Error Name', error.name],
    ['Error Message', error.message],
    ['Cause', error.cause ?? '—'],
  ];

  const detailRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:ui-monospace,Menlo,monospace;font-size:12px;word-break:break-word">${escapeHtml(value)}</td></tr>`
    )
    .join('');

  const stackHtml = stackFrames.length
    ? `<pre style="background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;overflow:auto;font-size:11px;line-height:1.5">${escapeHtml(stackFrames.join('\n'))}</pre>`
    : '<p style="color:#64748b">Stack trace tidak tersedia.</p>';

  const extraHtml =
    context.extra && Object.keys(context.extra).length > 0
      ? `<h3 style="color:#1E3A6E;margin:20px 0 8px">Konteks Tambahan</h3><pre style="background:#f1f5f9;padding:12px;border-radius:8px;overflow:auto;font-size:11px">${escapeHtml(JSON.stringify(context.extra, null, 2))}</pre>`
      : '';

  return `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;color:#1B2B4B">
      <div style="background:#DC2626;color:white;padding:16px 20px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">AWW Dev Log — Error Alert</h2>
        <p style="margin:6px 0 0;opacity:0.9;font-size:13px">${escapeHtml(error.name)}: ${escapeHtml(error.message)}</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 12px 12px">
        <h3 style="color:#1E3A6E;margin:0 0 12px">Detail Lokasi &amp; Konteks</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">${detailRows}</table>
        <h3 style="color:#1E3A6E;margin:20px 0 8px">Stack Trace</h3>
        ${stackHtml}
        ${extraHtml}
        <p style="margin-top:20px;font-size:11px;color:#94a3b8">AWW Laundry Dev Log — otomatis dari ${escapeHtml(context.source)}</p>
      </div>
    </div>
  `;
}

export async function reportAwwError(error: unknown, context: AwwErrorContext): Promise<void> {
  try {
    const normalized = normalizeError(error);
    const fp = fingerprint(normalized, context);
    if (!shouldSend(fp)) return;

    const recipient = getOwnerNotificationEmail();
    if (!recipient) return;

    const stackFrames = parseStackFrames(normalized.stack);
    const primaryFrame = parsePrimaryStackFrame(normalized.stack ?? '') || context.location || '—';
    const reportedAt = new Date();

    const htmlContent = buildDevErrorEmailHtml({
      error: normalized,
      context: {
        ...context,
        environment: context.environment ?? process.env.NODE_ENV ?? 'unknown',
      },
      stackFrames,
      primaryFrame,
      reportedAt,
    });

    const subject = `[AWW Dev Log] ${normalized.name} — ${context.source}${context.routePath ? ` @ ${context.routePath}` : ''}`;

    await sendDevErrorEmail({
      to: recipient,
      subject: subject.slice(0, 180),
      htmlContent,
      textContent: [
        `AWW Dev Log Error`,
        `Time: ${reportedAt.toISOString()}`,
        `Source: ${context.source}`,
        `Location: ${primaryFrame}`,
        `Route: ${context.routePath ?? '—'}`,
        `URL: ${context.url ?? '—'}`,
        `Message: ${normalized.message}`,
        '',
        normalized.stack ?? '(no stack)',
      ].join('\n'),
    });
  } catch (reportErr) {
    console.error('[AWW Dev Log] Failed to send error email:', reportErr);
  }
}

export function installProcessErrorHandlers() {
  if ((globalThis as { __awwDevLogInstalled?: boolean }).__awwDevLogInstalled) return;
  (globalThis as { __awwDevLogInstalled?: boolean }).__awwDevLogInstalled = true;

  process.on('uncaughtException', (err) => {
    void reportAwwError(err, { source: 'uncaught', location: 'process.uncaughtException' });
  });

  process.on('unhandledRejection', (reason) => {
    void reportAwwError(reason, { source: 'unhandled-rejection', location: 'process.unhandledRejection' });
  });
}
