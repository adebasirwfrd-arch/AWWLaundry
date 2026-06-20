import { prisma } from '@aww/database';
import { formatCurrency } from '@aww/shared';
import { sendCapexDueReminderEmail } from '@/lib/brevo';

export function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function isOnOrAfter(day: Date, target: Date): boolean {
  return startOfDay(day).getTime() >= startOfDay(target).getTime();
}

import { getOwnerRecipients } from '@/lib/owner-recipients';

export async function processCapexDueReminders(organizationId?: string) {
  const today = startOfDay(new Date());

  const expenses = await prisma.expense.findMany({
    where: {
      type: 'CAPEX',
      dueDate: { not: null },
      ...(organizationId ? { branch: { organizationId } } : {}),
      OR: [{ reminder3MonthsSentAt: null }, { reminder1MonthSentAt: null }],
    },
    include: {
      branch: { select: { name: true, organizationId: true } },
    },
  });

  let sent = 0;

  for (const exp of expenses) {
    if (!exp.dueDate) continue;

    const due = startOfDay(exp.dueDate);
    if (today.getTime() >= due.getTime()) continue;

    const orgId = exp.branch.organizationId;
    const owners = await getOwnerRecipients(orgId);
    if (owners.length === 0) continue;

    const remind3 = startOfDay(subtractMonths(due, 3));
    const remind1 = startOfDay(subtractMonths(due, 1));
    const net = exp.netAmount > 0 ? exp.netAmount : Math.max(0, exp.amount - exp.discount);

    if (!exp.reminder3MonthsSentAt && isOnOrAfter(today, remind3)) {
      for (const owner of owners) {
        await sendCapexDueReminderEmail({
          to: owner.email,
          name: owner.name,
          expenseTitle: exp.title || exp.category,
          branchName: exp.branch.name,
          vendor: exp.vendor,
          amount: net,
          dueDate: exp.dueDate,
          leadTime: '3 bulan',
        });
      }
      await prisma.expense.update({
        where: { id: exp.id },
        data: { reminder3MonthsSentAt: new Date() },
      });
      sent += 1;
    }

    if (!exp.reminder1MonthSentAt && isOnOrAfter(today, remind1)) {
      for (const owner of owners) {
        await sendCapexDueReminderEmail({
          to: owner.email,
          name: owner.name,
          expenseTitle: exp.title || exp.category,
          branchName: exp.branch.name,
          vendor: exp.vendor,
          amount: net,
          dueDate: exp.dueDate,
          leadTime: '1 bulan',
        });
      }
      await prisma.expense.update({
        where: { id: exp.id },
        data: { reminder1MonthSentAt: new Date() },
      });
      sent += 1;
    }
  }

  return { processed: expenses.length, remindersSent: sent };
}
