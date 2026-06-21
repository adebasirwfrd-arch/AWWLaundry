/**
 * Test kirim email AWW Dev Log.
 *
 * Dari folder blueprint/aww-laundry:
 *   npm run test:dev-log
 */
import { reportAwwError, AWW_DEV_LOG_RECIPIENT } from '@/lib/aww-dev-log-core';

async function main() {
  const err = new Error('Test error dari AWW Dev Log — abaikan jika ini uji coba');
  err.stack = [
    'Error: Test error dari AWW Dev Log — abaikan jika ini uji coba',
    '    at testDevLog (apps/web/scripts/test-dev-log.ts:12:15)',
    '    at Object.<anonymous> (apps/web/lib/owner-full-analytics.ts:99:5)',
    '    at async getOwnerAnalytics (apps/web/app/actions/analytics.ts:18:10)',
    '    at async AnalyticsPage (apps/web/app/(dashboard)/owner/analytics/page.tsx:10:16)',
  ].join('\n');

  await reportAwwError(err, {
    source: 'server',
    location: 'apps/web/scripts/test-dev-log.ts',
    routePath: '/owner/analytics',
    routeType: 'render',
    url: '/owner/analytics',
    method: 'GET',
    extra: { test: true, note: 'Ini email uji coba AWW Dev Log' },
  });

  console.log('AWW Dev Log test email dispatched to', AWW_DEV_LOG_RECIPIENT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
