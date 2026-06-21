'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { isAllowedMachineType, MACHINE_TYPE_LABELS } from '@/lib/machine-types';
import {
  formatUsageDuration,
  purchaseDateFromInputs,
  BUILDING_STATUS_LABELS,
} from '@/lib/capex-asset';
import { deriveMachineCondition } from '@/lib/machine-condition';
import { parseCustomerPaymentFromNotes } from '@/lib/payment-plan';

const BOARD_ROLES = [Role.WORKER, Role.MANAGER, Role.OWNER, Role.SUPER_ADMIN, Role.CASHIER];

function isOwnerLike(role: Role): boolean {
  return role === Role.OWNER || role === Role.SUPER_ADMIN;
}

async function assertBranchAccess(branchId: string) {
  const session = await requireAuth(BOARD_ROLES);
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId: session.user.organizationId, isActive: true },
    select: { id: true, name: true, code: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  if (!isOwnerLike(session.user.role) && session.user.branchId !== branchId) {
    throw new Error('Tidak punya akses ke cabang ini');
  }

  return { session, branch };
}

export async function listProductionBoardBranches() {
  const session = await requireAuth(BOARD_ROLES);
  if (!isOwnerLike(session.user.role)) {
    return [
      {
        id: session.user.branchId,
        name: session.user.branchName,
        code: '',
      },
    ];
  }

  return prisma.branch.findMany({
    where: { organizationId: session.user.organizationId, isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true },
  });
}

export async function getProductionBoardData(branchId: string) {
  const { branch } = await assertBranchAccess(branchId);

  const [rawOrders, machines] = await Promise.all([
    prisma.order.findMany({
      where: {
        branchId,
        paymentStatus: { in: ['PAID', 'PARTIAL', 'UNPAID'] },
        status: { notIn: ['ON_HOLD', 'PICKED_UP', 'DELIVERED', 'CANCELLED'] },
      },
      include: { customer: true, serviceType: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.machine.findMany({
      where: { branchId },
      orderBy: { name: 'asc' },
    }),
  ]);

  const orders = rawOrders.filter(
    (o) =>
      o.paymentStatus === 'PAID' ||
      o.paymentStatus === 'PARTIAL' ||
      (o.paymentStatus === 'UNPAID' && parseCustomerPaymentFromNotes(o.notes)?.mode === 'PAY_LATER')
  );

  return {
    branch,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      weightKg: o.weightKg,
      total: o.total,
      customer: { name: o.customer.name, phone: o.customer.phone },
      serviceType: { name: o.serviceType.name },
    })),
    machines: machines.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      status: m.status,
    })),
  };
}

export async function createProductionMachine(input: {
  branchId: string;
  serialNumber: string;
  type: string;
  capacityKg?: number | null;
}) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN]);

  const serial = input.serialNumber.trim();
  if (!serial) throw new Error('Nomor seri mesin wajib diisi');
  if (serial.length < 2) throw new Error('Nomor seri terlalu pendek');

  const type = input.type.trim().toUpperCase();
  if (!isAllowedMachineType(type)) throw new Error('Tipe mesin tidak valid');

  const branch = await prisma.branch.findFirst({
    where: {
      id: input.branchId,
      organizationId: session.user.organizationId,
      isActive: true,
    },
    select: { id: true, name: true },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');

  const duplicate = await prisma.machine.findFirst({
    where: { branchId: input.branchId, name: serial },
    select: { id: true },
  });
  if (duplicate) throw new Error(`Unit "${serial}" sudah terdaftar di cabang ${branch.name}`);

  const capacityKg =
    input.capacityKg != null && !Number.isNaN(input.capacityKg) && input.capacityKg > 0
      ? input.capacityKg
      : null;

  const machine = await prisma.machine.create({
    data: {
      branchId: input.branchId,
      name: serial,
      type,
      capacityKg,
      status: 'IDLE',
    },
  });

  revalidatePath('/worker');
  revalidatePath('/owner/cashflow');
  revalidatePath('/cashier/cashflow');

  return {
    id: machine.id,
    name: machine.name,
    type: machine.type,
    status: machine.status,
  };
}

export async function deleteProductionMachine(machineId: string) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN]);

  const machine = await prisma.machine.findFirst({
    where: {
      id: machineId,
      branch: { organizationId: session.user.organizationId },
    },
    select: { id: true, name: true, branchId: true },
  });
  if (!machine) throw new Error('Mesin tidak ditemukan');

  const logIds = await prisma.machineLog.findMany({
    where: { machineId },
    select: { id: true },
  });

  await prisma.$transaction([
    ...(logIds.length
      ? [
          prisma.machineTroubleComment.deleteMany({
            where: { machineLogId: { in: logIds.map((l) => l.id) } },
          }),
          prisma.machineLog.deleteMany({ where: { machineId } }),
        ]
      : []),
    prisma.machine.delete({ where: { id: machineId } }),
  ]);

  revalidatePath('/worker');
  revalidatePath('/owner/cashflow');
  revalidatePath('/cashier/cashflow');

  return { ok: true, name: machine.name };
}

export async function getMachineCapexDetail(machineId: string) {
  const session = await requireAuth([Role.OWNER, Role.SUPER_ADMIN]);

  const machine = await prisma.machine.findFirst({
    where: {
      id: machineId,
      branch: { organizationId: session.user.organizationId },
    },
    include: {
      expense: {
        include: {
          branch: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      },
    },
  });
  if (!machine) throw new Error('Mesin tidak ditemukan');

  const latestTrouble = await prisma.machineLog.findFirst({
    where: {
      machineId,
      eventType: 'TROUBLE_REPORTED',
      resolvedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    select: { note: true },
  });

  const expense = machine.expense;
  const purchaseDate = purchaseDateFromInputs(
    machine.purchaseYear ?? expense?.assetPurchaseYear,
    expense?.date ?? machine.createdAt
  );

  return {
    machine: {
      id: machine.id,
      name: machine.name,
      type: machine.type,
      typeLabel: MACHINE_TYPE_LABELS[machine.type] ?? machine.type,
      status: machine.status,
      capacityKg: machine.capacityKg,
      brand: machine.brand ?? expense?.assetBrand ?? null,
      modelType: machine.modelType ?? expense?.assetModelType ?? null,
      serialNumber: machine.serialNumber ?? machine.name,
      productionYear: machine.productionYear ?? expense?.assetProductionYear ?? null,
      purchaseYear: machine.purchaseYear ?? expense?.assetPurchaseYear ?? null,
    },
    expense: expense
      ? {
          id: expense.id,
          category: expense.category,
          title: expense.title,
          vendor: expense.vendor,
          amount: expense.amount,
          discount: expense.discount,
          netAmount: expense.netAmount,
          date: expense.date.toISOString(),
          dueDate: expense.dueDate?.toISOString() ?? null,
          description: expense.description,
          proofUrl: expense.proofUrl,
          branchName: expense.branch.name,
          createdBy: expense.createdBy.name,
          propertyAddress: expense.propertyAddress,
          propertyOwnerContact: expense.propertyOwnerContact,
          buildingStatus: expense.buildingStatus
            ? BUILDING_STATUS_LABELS[expense.buildingStatus]
            : null,
        }
      : null,
    usageDuration: formatUsageDuration(purchaseDate),
    purchaseDate: purchaseDate.toISOString(),
    hasCapexData: !!expense,
    currentCondition: deriveMachineCondition(machine.status, latestTrouble?.note),
  };
}
