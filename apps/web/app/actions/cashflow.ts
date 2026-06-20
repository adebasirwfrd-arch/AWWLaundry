'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role, type BuildingStatus, type ExpenseType, type PaymentMethod } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import {
  fetchCashflowOverview,
  fetchExpenseCategories,
} from '@/lib/cashflow-analytics';
import type { DashboardPeriod } from '@/lib/date-buckets';
import { defaultCategories } from '@/lib/expense-defaults';
import { processCapexDueReminders } from '@/lib/capex-due-reminders';
import { isBuildingCapexCategory } from '@/lib/capex-asset';
import { isAllowedMachineType, resolveMachineTypeFromCategory } from '@/lib/machine-types';

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
  assetBrand?: string;
  assetModelType?: string;
  assetSerialNumber?: string;
  assetProductionYear?: number | null;
  assetPurchaseYear?: number | null;
  propertyAddress?: string;
  propertyOwnerContact?: string;
  buildingStatus?: BuildingStatus | null;
  addToProductionBoard?: boolean;
  machineType?: string | null;
  machineCapacityKg?: number | null;
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

  const machineType =
    input.type === 'CAPEX' ? input.machineType ?? resolveMachineTypeFromCategory(category) : null;
  const isMachineCapex = !!machineType;
  const isBuildingCapex = input.type === 'CAPEX' && isBuildingCapexCategory(category);

  if (isMachineCapex) {
    if (!input.assetBrand?.trim()) throw new Error('Merk mesin wajib diisi');
    if (!input.assetModelType?.trim()) throw new Error('Tipe mesin wajib diisi');
    if (!input.assetSerialNumber?.trim()) throw new Error('Nomor seri mesin wajib diisi');
    if (!input.assetProductionYear) throw new Error('Tahun produksi wajib diisi');
    if (!input.assetPurchaseYear) throw new Error('Tahun pembelian wajib diisi');
    if (!input.vendor?.trim()) throw new Error('Vendor wajib diisi untuk CAPEX mesin');
  }

  if (isBuildingCapex) {
    if (!input.propertyAddress?.trim()) throw new Error('Alamat ruko wajib diisi');
    if (!input.propertyOwnerContact?.trim()) throw new Error('No. kontak pemilik ruko wajib diisi');
    if (!input.buildingStatus) throw new Error('Status bangunan (sewa/beli) wajib dipilih');
  }

  const canAddMachine =
    c.role === Role.OWNER || c.role === Role.SUPER_ADMIN
      ? input.addToProductionBoard === true
      : false;

  if (canAddMachine && machineType) {
    if (!isAllowedMachineType(machineType)) throw new Error('Tipe mesin tidak valid');
    const duplicate = await prisma.machine.findFirst({
      where: { branchId: branch.id, name: input.assetSerialNumber!.trim() },
      select: { id: true },
    });
    if (duplicate) throw new Error(`Unit "${input.assetSerialNumber!.trim()}" sudah terdaftar di cabang ${branch.name}`);
  }

  const expenseDate = new Date(input.date);
  const assetProductionYear = input.assetProductionYear ?? null;
  const assetPurchaseYear = input.assetPurchaseYear ?? null;

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
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
        date: expenseDate,
        dueDate,
        proofUrl: input.proofUrl ?? null,
        assetBrand: isMachineCapex ? input.assetBrand!.trim() : null,
        assetModelType: isMachineCapex ? input.assetModelType!.trim() : null,
        assetSerialNumber: isMachineCapex ? input.assetSerialNumber!.trim() : null,
        assetProductionYear: isMachineCapex ? assetProductionYear : null,
        assetPurchaseYear: isMachineCapex ? assetPurchaseYear : null,
        propertyAddress: isBuildingCapex ? input.propertyAddress!.trim() : null,
        propertyOwnerContact: isBuildingCapex ? input.propertyOwnerContact!.trim() : null,
        buildingStatus: isBuildingCapex ? input.buildingStatus! : null,
        createdById: c.userId,
      },
    });

    if (canAddMachine && machineType && isMachineCapex) {
      const serial = input.assetSerialNumber!.trim();
      const capacityKg =
        input.machineCapacityKg != null &&
        !Number.isNaN(input.machineCapacityKg) &&
        input.machineCapacityKg > 0
          ? input.machineCapacityKg
          : null;

      await tx.machine.create({
        data: {
          branchId: branch.id,
          name: serial,
          type: machineType,
          capacityKg,
          status: 'IDLE',
          expenseId: created.id,
          brand: input.assetBrand!.trim(),
          modelType: input.assetModelType!.trim(),
          serialNumber: serial,
          productionYear: assetProductionYear,
          purchaseYear: assetPurchaseYear,
        },
      });
    }

    return created;
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
    { type: input.type, category, title, amount: input.amount, netAmount }
  );

  revalidatePath('/owner/cashflow');
  revalidatePath('/cashier/cashflow');
  revalidatePath('/owner/audit-trail');
  if (canAddMachine && machineType) revalidatePath('/worker');

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
      assetBrand: expense.assetBrand,
      assetModelType: expense.assetModelType,
      assetSerialNumber: expense.assetSerialNumber,
      assetProductionYear: expense.assetProductionYear,
      assetPurchaseYear: expense.assetPurchaseYear,
      propertyAddress: expense.propertyAddress,
      propertyOwnerContact: expense.propertyOwnerContact,
      buildingStatus: expense.buildingStatus,
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

  const assetBrand = String(formData.get('assetBrand') ?? '').trim() || undefined;
  const assetModelType = String(formData.get('assetModelType') ?? '').trim() || undefined;
  const assetSerialNumber = String(formData.get('assetSerialNumber') ?? '').trim() || undefined;
  const assetProductionYearRaw = String(formData.get('assetProductionYear') ?? '').trim();
  const assetPurchaseYearRaw = String(formData.get('assetPurchaseYear') ?? '').trim();
  const propertyAddress = String(formData.get('propertyAddress') ?? '').trim() || undefined;
  const propertyOwnerContact = String(formData.get('propertyOwnerContact') ?? '').trim() || undefined;
  const buildingStatusRaw = String(formData.get('buildingStatus') ?? '').trim();
  const addToProductionBoard = String(formData.get('addToProductionBoard') ?? '') === 'true';
  const machineCapacityKgRaw = String(formData.get('machineCapacityKg') ?? '').trim();

  const assetProductionYear = assetProductionYearRaw ? parseInt(assetProductionYearRaw, 10) : null;
  const assetPurchaseYear = assetPurchaseYearRaw ? parseInt(assetPurchaseYearRaw, 10) : null;
  const machineCapacityKg = machineCapacityKgRaw ? parseFloat(machineCapacityKgRaw) : null;
  const buildingStatus =
    buildingStatusRaw === 'SEWA' || buildingStatusRaw === 'BELI'
      ? (buildingStatusRaw as BuildingStatus)
      : null;

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
    assetBrand,
    assetModelType,
    assetSerialNumber,
    assetProductionYear,
    assetPurchaseYear,
    propertyAddress,
    propertyOwnerContact,
    buildingStatus,
    addToProductionBoard,
    machineCapacityKg,
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
  revalidatePath('/owner/audit-trail');
  return { ok: true };
}
