/**
 * Test Brevo CAPEX due-date reminder.
 * Run: npx tsx scripts/test-capex-reminder.ts
 */
import { readFileSync } from 'fs';
import path from 'path';

// Load monorepo root .env.local
const envPath = path.resolve(__dirname, '../../../.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq < 0) continue;
  const key = t.slice(0, eq);
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = val;
}

// Local dev uses SQLite (packages/database/prisma/dev.db)
process.env.DATABASE_URL = `file:${path.resolve(__dirname, '../../../packages/database/prisma/dev.db')}`;

async function main() {
  const { prisma } = await import('@aww/database');
  const { sendCapexDueReminderEmail } = await import('../lib/brevo');
  const { processCapexDueReminders, subtractMonths } = await import('../lib/capex-due-reminders');

  const ownerEmail = process.env.BREVO_SENDER_EMAIL ?? 'adeazhar.wfrd@gmail.com';
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 25);

  console.log('1) Direct Brevo test email →', ownerEmail);
  const direct = await sendCapexDueReminderEmail({
    to: ownerEmail,
    name: 'Ade Azhar',
    expenseTitle: 'TEST — Sewa Ruko Jakarta Selatan',
    branchName: 'AWW Laundry Jakarta Selatan',
    vendor: 'PT Test Vendor',
    amount: 5_000_000,
    dueDate,
    leadTime: '1 bulan',
  });
  console.log('   Direct send result:', direct);

  const branch = await prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
  const owner = await prisma.user.findFirst({
    where: { email: 'owner@awwlaundry.com' },
  });
  if (!branch || !owner) {
    console.error('Branch/owner not found — run db:seed first');
    process.exit(1);
  }

  const remind1 = subtractMonths(dueDate, 1);
  console.log('2) Seed CAPEX expense — due', dueDate.toISOString().slice(0, 10));
  console.log('   1-month reminder date:', remind1.toISOString().slice(0, 10));

  const expense = await prisma.expense.create({
    data: {
      branchId: branch.id,
      type: 'CAPEX',
      category: 'Sewa Ruko',
      title: 'TEST Reminder — Sewa Ruko',
      vendor: 'PT Test Vendor',
      amount: 5_000_000,
      discount: 0,
      netAmount: 5_000_000,
      date: new Date(),
      dueDate,
      createdById: owner.id,
    },
  });

  console.log('3) Run processCapexDueReminders...');
  const result = await processCapexDueReminders();
  console.log('   Result:', result);

  const updated = await prisma.expense.findUnique({ where: { id: expense.id } });
  console.log('4) Reminder flags:', {
    reminder3MonthsSentAt: updated?.reminder3MonthsSentAt,
    reminder1MonthSentAt: updated?.reminder1MonthSentAt,
  });

  // Also patch owner email to real inbox for pipeline test (optional one-time)
  await prisma.user.update({
    where: { id: owner.id },
    data: { email: ownerEmail },
  });
  console.log('5) Owner email updated to', ownerEmail, 'for reminder pipeline');

  // Reset 1-month flag and re-run to hit owner inbox via pipeline
  await prisma.expense.update({
    where: { id: expense.id },
    data: { reminder1MonthSentAt: null },
  });
  const result2 = await processCapexDueReminders();
  console.log('6) Second run (owner inbox):', result2);

  console.log('\n✅ Test selesai. Cek inbox:', ownerEmail);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Test gagal:', e);
  process.exit(1);
});
