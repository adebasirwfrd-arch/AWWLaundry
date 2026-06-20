'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role, type ExpenseType, type PaymentMethod } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import {
  fetchCashflowOverview,
  fetchExpenseCategories,
} from '@/lib/cashflow-analytics';
import type { DashboardPeriod } from '@/lib/date-buckets';
import { defaultCategories } from '@/lib/expense-defaults';
import { processCapexDueReminders } from '@/lib/capex-due-reminders';

const VIEW_ROLES = [Role.OWNER, Role.SUPER_ADMIN, Role.MANAGER, Role.CASHIER];

async function ctx() {
  const session = await requireAuth(VIEW_ROLES);
  const branchLocked =
    session.user.role === Role.MANAGER || session.user.role === Role.CASHIER;
  return {
    organizationId: session.user.organizationId,
    branchId: session.user.branchId,
    userId: session.user.id,
    role: session.user.role,
    managerBranchId: branchLocked ? session.user.branchId : undefined,
  };
}

export async function getCashflowData(input: {
  period: DashboardPeriod;
  branchId?: string;
}) {
  const c = await ctx();
  // Reminder di background — jangan blokir UI cashflow
  void processCapexDueReminders(c.organizationId).catch((err) => {
    console.error('[CAPEX reminders]', err);
  });
  return fetchCashflowOverview({
    organizationId: c.organizationId,
    branchId: input.branchId || c.managerBranchId,
    period: input.period,
    managerBranchId: c.managerBranchId,
  });
}

export async function getExpenseCategoryOptions(type: ExpenseType, branchId?: string) {
  const c = await ctx();
  const custom = await fetchExpenseCategories(c.organizationId, type, branchId || c.managerBranchId);
  const defaults = defaultCategories(type);
  return [...new Set([...defaults, ...custom])];
}

export async function createExpense(input: {
  branchId: string;
  type: ExpenseType;
  category: string;
  title: string;
  vendor?: string;
  paymentMethod?: PaymentMethod;
  amount: number;
  discount?: number;
  description?: string;
  date: string;
  dueDate?: string;
  proofUrl?: string;
}) {
  const c = await ctx();
  const category = input.category.trim();
  const title = input.title.trim() || category;
  if (!category) throw new Error('Kategori wajib diisi');
  if (input.amount <= 0) throw new Error('Harga harus lebih dari 0');

  const branch = await prisma.branch.findFirst({
    where: {
      id: input.branchId,
      organizationId: c.organizationId,
      ...(c.managerBranchId ? { id: c.managerBranchId } : {}),
    },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const discount = Math.max(0, input.discount ?? 0);
  const netAmount = Math.max(0, input.amount - discount);

  let dueDate: Date | null = null;
  if (input.type === 'CAPEX' && input.dueDate) {
    dueDate = new Date(input.dueDate);
    if (Number.isNaN(dueDate.getTime())) throw new Error('Due date tidak valid');
    const expenseDate = new Date(input.date);
    if (dueDate.getTime() < expenseDate.getTime()) {
      throw new Error('Due date harus setelah tanggal transaksi');
    }
  }

  const expense = await prisma.expense.create({
    data: {
      branchId: branch.id,
      type: input.type,
      category,
      title,
      vendor: input.vendor?.trim() || null,
      paymentMethod: input.paymentMethod ?? null,
      amount: input.amount,
      discount,
      netAmount,
      description: input.description?.trim() || null,
      date: new Date(input.date),
      dueDate,
      proofUrl: input.proofUrl ?? null,
      createdById: c.userId,
    },
  });

  if (dueDate) {
    void processCapexDueReminders(c.organizationId).catch(console.error);
  }

  await createAuditLog(
    { organizationId: c.organizationId, branchId: branch.id, userId: c.userId },
    'EXPENSE_CREATED',
    'Expense',
    expense.id,
    null,
    { type: input.type, category, netAmount }
  );

  revalidatePath('/owner/cashflow');
  revalidatePath('/cashier/cashflow');

  const creator = await prisma.user.findUnique({
    where: { id: c.userId },
    select: { name: true },
  });

  return {
    expense: {
      id: expense.id,
      date: expense.date.toISOString(),
      dueDate: expense.dueDate?.toISOString() ?? null,
      proofUrl: expense.proofUrl,
      type: expense.type,
      category: expense.category,
      title: expense.title,
      vendor: expense.vendor,
      paymentMethod: expense.paymentMethod,
      amount: expense.amount,
      discount: expense.discount,
      netAmount: expense.netAmount,
      branchName: branch.name,
      createdBy: creator?.name ?? '—',
      description: expense.description,
    },
  };
}

/** Simpan CAPEX/OPEX + upload bukti bayar dalam satu request (lebih stabil daripada 2 server action). */
export async function createExpenseWithProof(formData: FormData) {
  const c = await ctx();

  const branchId = String(formData.get('branchId') ?? '');
  const type = String(formData.get('type') ?? 'OPEX') as ExpenseType;
  const category = String(formData.get('category') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim() || category;
  const vendor = String(formData.get('vendor') ?? '').trim() || undefined;
  const paymentMethodRaw = String(formData.get('paymentMethod') ?? '');
  const paymentMethod = (paymentMethodRaw || undefined) as PaymentMethod | undefined;
  const amount = parseFloat(String(formData.get('amount') ?? '0'));
  const discount = parseFloat(String(formData.get('discount') ?? '0')) || 0;
  const description = String(formData.get('description') ?? '').trim() || undefined;
  const date = String(formData.get('date') ?? '');
  const dueDateRaw = String(formData.get('dueDate') ?? '');

  if (!branchId) throw new Error('Pilih cabang terlebih dahulu');
  if (!category) throw new Error('Isi kategori atau judul/deskripsi');
  if (!amount || amount <= 0) throw new Error('Harga harus lebih dari 0');
  if (!date) throw new Error('Tanggal wajib diisi');

  const proofUrlRaw = String(formData.get('proofUrl') ?? '').trim();
  const needsProof = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'QRIS';
  if (needsProof && !proofUrlRaw) {
    throw new Error('Upload bukti bayar wajib untuk Transfer / QRIS');
  }

  return createExpense({
    branchId,
    type,
    category,
    title,
    vendor,
    paymentMethod,
    amount,
    discount,
    description,
    date,
    dueDate: type === 'CAPEX' && dueDateRaw ? dueDateRaw : undefined,
    proofUrl: proofUrlRaw || undefined,
  });
}

export async function deleteExpense(expenseId: string) {
  const c = await ctx();
  const expense = await prisma.expense.findFirst({
    where: {
      id: expenseId,
      branch: { organizationId: c.organizationId },
      ...(c.managerBranchId ? { branchId: c.managerBranchId } : {}),
    },
  });
  if (!expense) throw new Error('Pengeluaran tidak ditemukan');

  await prisma.expense.delete({ where: { id: expenseId } });

  await createAuditLog(
    { organizationId: c.organizationId, branchId: expense.branchId, userId: c.userId },
    'EXPENSE_DELETED',
    'Expense',
    expenseId,
    { netAmount: expense.netAmount },
    null
  );

  revalidatePath('/owner/cashflow');
  revalidatePath('/cashier/cashflow');
  return { ok: true };
}
