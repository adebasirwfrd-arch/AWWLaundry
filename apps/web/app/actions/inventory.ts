'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role, StockMovementType } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';

const INVENTORY_ROLES = [Role.OWNER, Role.MANAGER];

async function inventoryCtx(branchId?: string) {
  const session = await requireAuth(INVENTORY_ROLES);
  const targetBranchId = branchId ?? session.user.branchId;
  const branch = await prisma.branch.findFirst({
    where: { id: targetBranchId, organizationId: session.user.organizationId },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');
  return { session, branchId: targetBranchId, organizationId: session.user.organizationId };
}

export async function listInventoryItems(branchId?: string) {
  const { branchId: bid } = await inventoryCtx(branchId);
  return prisma.inventoryItem.findMany({
    where: { branchId: bid },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function listStockMovements(branchId?: string, limit = 50) {
  const { branchId: bid } = await inventoryCtx(branchId);
  return prisma.stockMovement.findMany({
    where: { item: { branchId: bid } },
    include: { item: { select: { name: true, unit: true, sku: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listStockOpnames(branchId?: string) {
  const { branchId: bid } = await inventoryCtx(branchId);
  return prisma.stockOpname.findMany({
    where: { branchId: bid },
    include: {
      lines: { include: { item: { select: { name: true, unit: true, sku: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function upsertInventoryItem(input: {
  id?: string;
  branchId?: string;
  sku?: string;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  minStock: number;
  currentStock?: number;
}) {
  const { session, branchId, organizationId } = await inventoryCtx(input.branchId);

  if (input.id) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id: input.id, branchId },
    });
    if (!existing) throw new Error('Item tidak ditemukan');

    const updated = await prisma.inventoryItem.update({
      where: { id: input.id },
      data: {
        sku: input.sku || null,
        name: input.name,
        category: input.category,
        unit: input.unit,
        unitCost: input.unitCost,
        minStock: input.minStock,
      },
    });
    revalidatePath('/owner/inventory');
    return updated;
  }

  const item = await prisma.inventoryItem.create({
    data: {
      branchId,
      sku: input.sku || null,
      name: input.name,
      category: input.category,
      unit: input.unit,
      unitCost: input.unitCost,
      minStock: input.minStock,
      currentStock: input.currentStock ?? 0,
    },
  });

  if ((input.currentStock ?? 0) > 0) {
    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: StockMovementType.IN,
        qty: input.currentStock!,
        reference: 'Stok awal',
        createdById: session.user.id,
      },
    });
  }

  await createAuditLog(
    { organizationId, branchId, userId: session.user.id },
    'STOCK_ADJUSTED',
    'InventoryItem',
    item.id,
    null,
    { action: 'created', name: item.name }
  );

  revalidatePath('/owner/inventory');
  return item;
}

export async function recordStockMovement(input: {
  itemId: string;
  type: 'IN' | 'OUT';
  qty: number;
  reference?: string;
  branchId?: string;
}) {
  const { session, branchId, organizationId } = await inventoryCtx(input.branchId);
  if (input.qty <= 0) throw new Error('Jumlah harus lebih dari 0');

  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, branchId },
  });
  if (!item) throw new Error('Item tidak ditemukan');

  const delta = input.type === 'IN' ? input.qty : -input.qty;
  const newStock = item.currentStock + delta;
  if (newStock < 0) throw new Error('Stok tidak cukup');

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        type: input.type as StockMovementType,
        qty: input.qty,
        reference: input.reference ?? null,
        createdById: session.user.id,
      },
    });
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { currentStock: newStock },
    });
  });

  await createAuditLog(
    { organizationId, branchId, userId: session.user.id },
    'STOCK_ADJUSTED',
    'InventoryItem',
    item.id,
    { stock: item.currentStock },
    { stock: newStock, type: input.type, qty: input.qty }
  );

  revalidatePath('/owner/inventory');
  return { ok: true, newStock };
}

/** Step 1: Buat sesi opname — snapshot stok sistem. */
export async function createStockOpname(branchId?: string) {
  const { session, branchId: bid, organizationId } = await inventoryCtx(branchId);

  const draft = await prisma.stockOpname.findFirst({
    where: { branchId: bid, status: { in: ['DRAFT', 'COUNTING'] } },
  });
  if (draft) throw new Error('Masih ada opname yang belum selesai');

  const items = await prisma.inventoryItem.findMany({ where: { branchId: bid } });
  if (items.length === 0) throw new Error('Belum ada item inventori');

  const opname = await prisma.$transaction(async (tx) => {
    const created = await tx.stockOpname.create({
      data: {
        branchId: bid,
        period: new Date(),
        status: 'COUNTING',
        createdById: session.user.id,
        lines: {
          create: items.map((item) => ({
            itemId: item.id,
            systemQty: item.currentStock,
            physicalQty: item.currentStock,
            variance: 0,
            varianceCost: 0,
          })),
        },
      },
      include: { lines: { include: { item: true } } },
    });
    return created;
  });

  await createAuditLog(
    { organizationId, branchId: bid, userId: session.user.id },
    'STOCK_OPNAME_CREATED',
    'StockOpname',
    opname.id,
    null,
    { lineCount: items.length }
  );

  revalidatePath('/owner/inventory');
  return opname;
}

/** Step 2: Update hitungan fisik per baris. */
export async function updateOpnameLine(input: {
  lineId: string;
  physicalQty: number;
  branchId?: string;
}) {
  const { branchId } = await inventoryCtx(input.branchId);

  const line = await prisma.stockOpnameLine.findUnique({
    where: { id: input.lineId },
    include: { opname: true, item: true },
  });
  if (!line || line.opname.branchId !== branchId) throw new Error('Baris opname tidak ditemukan');
  if (!['DRAFT', 'COUNTING'].includes(line.opname.status)) {
    throw new Error('Opname sudah tidak bisa diubah');
  }

  const variance = input.physicalQty - line.systemQty;
  const varianceCost = variance * (line.item.unitCost ?? 0);

  return prisma.stockOpnameLine.update({
    where: { id: input.lineId },
    data: { physicalQty: input.physicalQty, variance, varianceCost },
  });
}

/** Step 3: Rekonsiliasi kas. */
export async function updateOpnameCash(input: {
  opnameId: string;
  cashExpected: number;
  cashActual: number;
  notes?: string;
  branchId?: string;
}) {
  const { branchId } = await inventoryCtx(input.branchId);

  const opname = await prisma.stockOpname.findFirst({
    where: { id: input.opnameId, branchId },
  });
  if (!opname || !['DRAFT', 'COUNTING'].includes(opname.status)) {
    throw new Error('Opname tidak ditemukan');
  }

  const cashVariance = input.cashActual - input.cashExpected;
  return prisma.stockOpname.update({
    where: { id: input.opnameId },
    data: {
      cashExpected: input.cashExpected,
      cashActual: input.cashActual,
      cashVariance,
      notes: input.notes ?? null,
    },
  });
}

/** Step 4: Approve — sesuaikan stok & catat pergerakan. */
export async function approveStockOpname(opnameId: string, branchId?: string) {
  const { session, branchId: bid, organizationId } = await inventoryCtx(branchId);

  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, branchId: bid },
    include: { lines: { include: { item: true } } },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');
  if (!['DRAFT', 'COUNTING'].includes(opname.status)) {
    throw new Error('Opname sudah disetujui atau dibatalkan');
  }

  await prisma.$transaction(async (tx) => {
    for (const line of opname.lines) {
      if (Math.abs(line.variance) < 0.0001) {
        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: { lastCountedAt: new Date() },
        });
        continue;
      }

      await tx.stockMovement.create({
        data: {
          itemId: line.itemId,
          type: StockMovementType.ADJUSTMENT,
          qty: Math.abs(line.variance),
          reference: `Opname ${opname.id.slice(-6)} (${line.variance > 0 ? '+' : '-'}${line.variance})`,
          createdById: session.user.id,
        },
      });

      await tx.inventoryItem.update({
        where: { id: line.itemId },
        data: {
          currentStock: line.physicalQty,
          lastCountedAt: new Date(),
        },
      });

      await createAuditLog(
        { organizationId, branchId: bid, userId: session.user.id },
        'STOCK_ADJUSTED',
        'InventoryItem',
        line.itemId,
        { stock: line.systemQty },
        { stock: line.physicalQty, variance: line.variance, opnameId }
      );
    }

    await tx.stockOpname.update({
      where: { id: opnameId },
      data: {
        status: 'APPROVED',
        approvedById: session.user.id,
        approvedAt: new Date(),
      },
    });
  });

  revalidatePath('/owner/inventory');
  return { ok: true };
}

export async function cancelStockOpname(opnameId: string, branchId?: string) {
  const { branchId: bid } = await inventoryCtx(branchId);

  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, branchId: bid, status: { in: ['DRAFT', 'COUNTING'] } },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');

  await prisma.stockOpname.update({
    where: { id: opnameId },
    data: { status: 'CANCELLED' },
  });

  revalidatePath('/owner/inventory');
  return { ok: true };
}

export async function getInventorySummary(branchId?: string) {
  const { branchId: bid } = await inventoryCtx(branchId);
  const items = await prisma.inventoryItem.findMany({ where: { branchId: bid } });

  const lowStock = items.filter((i) => i.currentStock <= i.minStock);
  const totalValue = items.reduce((s, i) => s + i.currentStock * (i.unitCost ?? 0), 0);
  const activeOpname = await prisma.stockOpname.findFirst({
    where: { branchId: bid, status: { in: ['DRAFT', 'COUNTING'] } },
    include: { lines: { include: { item: { select: { name: true, unit: true, sku: true } } } } },
  });

  return {
    itemCount: items.length,
    lowStockCount: lowStock.length,
    totalValue,
    lowStock,
    activeOpname,
  };
}
