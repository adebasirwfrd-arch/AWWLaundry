'use server';

import { revalidatePath } from 'next/cache';
import { prisma, Role, StockMovementType } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { createAuditLog } from '@/lib/audit';
import {
  notifyOpnameApproved,
  notifyOpnameDraftCreated,
  notifyOpnameRejected,
  notifyOpnameRevisionRequested,
  notifyOpnameSubmittedForApproval,
  dismissOpnameNotifications,
} from '@/lib/opname-notifications';
import { inferOpnameResumeStep } from '@/lib/opname-utils';
import { computeExpectedBranchCash } from '@/lib/branch-cash-ledger';

const INVENTORY_ROLES = [Role.OWNER, Role.MANAGER, Role.CASHIER];
const INVENTORY_ADMIN_ROLES = [Role.OWNER, Role.MANAGER];

function isApprover(role: Role) {
  return role === Role.OWNER || role === Role.SUPER_ADMIN;
}

async function inventoryCtx(branchId?: string) {
  const session = await requireAuth(INVENTORY_ROLES);
  const targetBranchId =
    session.user.role === Role.CASHIER ? session.user.branchId : (branchId ?? session.user.branchId);
  const branch = await prisma.branch.findFirst({
    where: { id: targetBranchId, organizationId: session.user.organizationId },
  });
  if (!branch) throw new Error('Cabang tidak ditemukan');
  return { session, branchId: targetBranchId, organizationId: session.user.organizationId };
}

export async function listInventoryItems(branchId?: string) {
  const { branchId: bid } = await inventoryCtx(branchId);
  const items = await prisma.inventoryItem.findMany({
    where: { branchId: bid },
    orderBy: [{ category: 'asc' }, { name: 'asc' }, { sku: 'desc' }],
  });
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = (item.sku ?? item.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
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
  if (session.user.role === Role.CASHIER) {
    throw new Error('Kasir tidak dapat menambah item master');
  }

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
  revalidatePath('/cashier/inventory');
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
  revalidatePath('/cashier/inventory');
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
  if (session.user.role === Role.CASHIER && input.type === 'OUT') {
    throw new Error('Kasir hanya bisa mencatat stok masuk. Stok keluar melalui stock opname.');
  }
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
  revalidatePath('/cashier/inventory');
  return { ok: true, newStock };
}

function canManageOpnameSession(role: Role, createdById: string | null | undefined, userId: string) {
  if (!createdById || createdById === userId) return true;
  return role === Role.OWNER || role === Role.SUPER_ADMIN || role === Role.MANAGER;
}


/** Step 1: Buat sesi opname — snapshot stok sistem. */
export async function createStockOpname(branchId?: string) {
  const { session, branchId: bid, organizationId } = await inventoryCtx(branchId);
  const role = session.user.role as Role;

  const existing = await prisma.stockOpname.findFirst({
    where: { branchId: bid, status: { in: ['DRAFT', 'COUNTING', 'PENDING_APPROVAL'] } },
    orderBy: { createdAt: 'desc' },
    include: { lines: { include: { item: true } } },
  });

  if (existing) {
    if (existing.status === 'PENDING_APPROVAL') {
      throw new Error(
        'Opname menunggu persetujuan owner. Lanjutkan dari Kotak Masuk atau tab Stock Opname.'
      );
    }
    if (!canManageOpnameSession(role, existing.createdById, session.user.id)) {
      throw new Error(
        'Ada opname berjalan yang dibuat staff lain. Minta mereka menyelesaikan atau membatalkan terlebih dahulu.'
      );
    }
    return existing;
  }

  const items = await prisma.inventoryItem.findMany({
    where: { branchId: bid },
    orderBy: [{ sku: 'desc' }, { name: 'asc' }],
  });
  if (items.length === 0) throw new Error('Belum ada item inventori');

  const seen = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const key = (item.sku ?? item.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const opname = await prisma.$transaction(async (tx) => {
    const created = await tx.stockOpname.create({
      data: {
        branchId: bid,
        period: new Date(),
        status: 'DRAFT',
        createdById: session.user.id,
        lines: {
          create: uniqueItems.map((item) => ({
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
    { status: 'DRAFT', lineCount: uniqueItems.length }
  );

  revalidatePath('/owner/inventory');
  revalidatePath('/cashier/inventory');
  revalidatePath('/cashier/inbox');
  revalidatePath('/owner/audit-trail');

  const branch = await prisma.branch.findUnique({ where: { id: bid }, select: { name: true } });
  void notifyOpnameDraftCreated({
    userId: session.user.id,
    opnameId: opname.id,
    branchId: bid,
    branchName: branch?.name ?? 'Cabang',
    step: 'count',
    userRole: role,
  }).catch(() => {});

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

/** Tandai hitungan fisik selesai — lanjut ke rekonsiliasi kas. */
export async function completeOpnameCountStep(opnameId: string, branchId?: string) {
  const { branchId: bid } = await inventoryCtx(branchId);

  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, branchId: bid },
  });
  if (!opname || !['DRAFT', 'COUNTING'].includes(opname.status)) {
    throw new Error('Opname tidak ditemukan');
  }

  if (opname.status === 'DRAFT') {
    await prisma.stockOpname.update({
      where: { id: opnameId },
      data: { status: 'COUNTING' },
    });
  }

  return { ok: true };
}

/** Step 3: Rekonsiliasi kas. */
export async function updateOpnameCash(input: {
  opnameId: string;
  cashActual: number;
  notes?: string;
  branchId?: string;
}) {
  const { branchId } = await inventoryCtx(input.branchId);

  const opname = await prisma.stockOpname.findFirst({
    where: { id: input.opnameId, branchId },
    include: { lines: true },
  });
  if (!opname || !['DRAFT', 'COUNTING'].includes(opname.status)) {
    throw new Error('Opname tidak ditemukan');
  }
  if (!Number.isFinite(input.cashActual) || input.cashActual < 0) {
    throw new Error('Kas aktual wajib diisi');
  }

  // Kas seharusnya ditetapkan sistem — tidak bisa diedit user.
  // Snapshot sekali per sesi; opname berikutnya memakai kas aktual setelah owner approve.
  const cashExpected =
    opname.cashExpected ?? (await computeExpectedBranchCash(branchId));
  const cashVariance = input.cashActual - cashExpected;
  const hasStockVariance = opname.lines.some((line) => line.variance !== 0);
  if ((cashVariance !== 0 || hasStockVariance) && !input.notes?.trim()) {
    throw new Error('Ada selisih stok atau kas — wajib isi catatan penjelasan');
  }

  return prisma.stockOpname.update({
    where: { id: input.opnameId },
    data: {
      cashExpected,
      cashActual: input.cashActual,
      cashVariance,
      notes: input.notes ?? null,
    },
  });
}

/** Step 4a: Manager ajukan ke owner — kirim email & notifikasi inbox. */
export async function submitStockOpnameForApproval(opnameId: string, branchId?: string) {
  const { session, branchId: bid, organizationId } = await inventoryCtx(branchId);

  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, branchId: bid },
    include: {
      lines: { include: { item: true } },
      branch: { select: { name: true } },
    },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');
  if (opname.status !== 'COUNTING') {
    throw new Error('Opname tidak bisa diajukan — pastikan hitungan fisik & kas sudah lengkap');
  }
  if (opname.cashExpected == null || opname.cashActual == null) {
    throw new Error('Rekonsiliasi kas wajib diisi sebelum diajukan');
  }

  const totalVarianceCost = opname.lines.reduce((s, l) => s + Math.abs(l.varianceCost ?? 0), 0);

  await prisma.stockOpname.update({
    where: { id: opnameId },
    data: { status: 'PENDING_APPROVAL' },
  });

  await createAuditLog(
    { organizationId, branchId: bid, userId: session.user.id },
    'STOCK_OPNAME_CREATED',
    'StockOpname',
    opnameId,
    { status: 'COUNTING' },
    { status: 'PENDING_APPROVAL' }
  );

  await dismissOpnameNotifications(opnameId);

  void notifyOpnameSubmittedForApproval({
    opnameId,
    branchId: bid,
    branchName: opname.branch.name,
    submittedByName: session.user.name ?? 'Staff',
    lineCount: opname.lines.length,
    totalVarianceCost,
    cashVariance: opname.cashVariance,
    excludeUserId: session.user.role === Role.OWNER ? session.user.id : undefined,
  }).catch(() => {});

  revalidatePath('/owner/inventory');
  revalidatePath('/cashier/inventory');
  revalidatePath('/cashier/inbox');
  return { ok: true };
}

/** List opname belum selesai (draft) — untuk kotak masuk pembuat sesi. */
export async function listUnfinishedOpnamesForInbox() {
  const session = await requireAuth(INVENTORY_ROLES);
  const role = session.user.role as Role;

  const rows = await prisma.stockOpname.findMany({
    where: {
      status: { in: ['DRAFT', 'COUNTING'] },
      createdById: session.user.id,
      branch: { organizationId: session.user.organizationId },
      ...(role === Role.CASHIER ? { branchId: session.user.branchId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      lines: { include: { item: { select: { name: true, unit: true } } } },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    status: o.status,
    period: o.period,
    createdAt: o.createdAt,
    branchId: o.branch.id,
    branchName: o.branch.name,
    branchCode: o.branch.code,
    cashExpected: o.cashExpected,
    cashActual: o.cashActual,
    lineCount: o.lines.length,
    resumeStep: inferOpnameResumeStep(o),
    totalVariance: o.lines.reduce((s, l) => s + Math.abs(l.variance), 0),
  }));
}

/** List opname menunggu approve — untuk kotak masuk owner. */
export async function listPendingOpnameApprovals(branchId?: string) {
  const session = await requireAuth([...INVENTORY_ROLES, Role.SUPER_ADMIN]);

  const where =
    isApprover(session.user.role as Role) && !branchId
      ? { status: 'PENDING_APPROVAL' as const, branch: { organizationId: session.user.organizationId } }
      : {
          status: 'PENDING_APPROVAL' as const,
          branchId:
            session.user.role === Role.CASHIER ? session.user.branchId : (branchId ?? session.user.branchId),
        };

  const rows = await prisma.stockOpname.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      branch: { select: { name: true, code: true } },
      lines: { include: { item: { select: { name: true, unit: true, sku: true } } } },
    },
  });

  const creatorIds = [...new Set(rows.map((r) => r.createdById).filter(Boolean))] as string[];
  const creators =
    creatorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: { id: true, name: true } })
      : [];
  const creatorMap = new Map(creators.map((c) => [c.id, c.name]));

  return rows.map((o) => ({
    ...o,
    submittedBy: o.createdById ? (creatorMap.get(o.createdById) ?? null) : null,
  }));
}

/** Step 4b: Owner approve — sesuaikan stok & catat pergerakan. */
export async function approveStockOpname(opnameId: string, branchId?: string) {
  const session = await requireAuth([...INVENTORY_ROLES, Role.SUPER_ADMIN]);
  const organizationId = session.user.organizationId;

  if (!isApprover(session.user.role as Role)) {
    throw new Error('Hanya owner yang dapat menyetujui stock opname');
  }

  const opname = await prisma.stockOpname.findFirst({
    where: {
      id: opnameId,
      branch: { organizationId },
      ...(branchId ? { branchId } : {}),
    },
    include: { lines: { include: { item: true } } },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');
  const bid = opname.branchId;
  if (!['COUNTING', 'PENDING_APPROVAL'].includes(opname.status)) {
    throw new Error('Opname sudah disetujui atau dibatalkan');
  }
  if (opname.status === 'COUNTING' && session.user.role === Role.MANAGER) {
    throw new Error('Manager harus ajukan persetujuan ke owner terlebih dahulu');
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

  await dismissOpnameNotifications(opnameId);

  void notifyOpnameApproved({
    branchId: bid,
    opnameId,
    approvedByName: session.user.name ?? 'Owner',
    createdById: opname.createdById,
  }).catch(() => {});

  revalidatePath('/owner/inventory');
  revalidatePath('/cashier/inventory');
  revalidatePath('/cashier/inbox');
  return { ok: true };
}

/** Owner tolak opname yang diajukan. */
export async function rejectStockOpname(opnameId: string, reason?: string, branchId?: string) {
  const session = await requireAuth([...INVENTORY_ROLES, Role.SUPER_ADMIN]);

  if (!isApprover(session.user.role as Role)) {
    throw new Error('Hanya owner yang dapat menolak stock opname');
  }

  const opname = await prisma.stockOpname.findFirst({
    where: {
      id: opnameId,
      status: 'PENDING_APPROVAL',
      branch: { organizationId: session.user.organizationId },
      ...(branchId ? { branchId } : {}),
    },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');
  const bid = opname.branchId;

  await prisma.stockOpname.update({
    where: { id: opnameId },
    data: { status: 'REJECTED', notes: reason ? `Ditolak: ${reason}` : 'Ditolak owner' },
  });

  await dismissOpnameNotifications(opnameId);

  void notifyOpnameRejected({
    branchId: bid,
    opnameId,
    rejectedByName: session.user.name ?? 'Owner',
    reason,
    createdById: opname.createdById,
  }).catch(() => {});

  revalidatePath('/owner/inventory');
  revalidatePath('/cashier/inventory');
  revalidatePath('/cashier/inbox');
  return { ok: true };
}

/** Owner kembalikan opname ke kasir untuk revisi. */
export async function requestOpnameRevision(opnameId: string, note: string, branchId?: string) {
  const session = await requireAuth([...INVENTORY_ROLES, Role.SUPER_ADMIN]);

  if (!isApprover(session.user.role as Role)) {
    throw new Error('Hanya owner yang dapat meminta revisi');
  }
  if (!note.trim()) throw new Error('Catatan revisi wajib diisi');

  const opname = await prisma.stockOpname.findFirst({
    where: {
      id: opnameId,
      status: 'PENDING_APPROVAL',
      branch: { organizationId: session.user.organizationId },
      ...(branchId ? { branchId } : {}),
    },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');

  await prisma.stockOpname.update({
    where: { id: opnameId },
    data: {
      status: 'COUNTING',
      notes: `Revisi diminta: ${note.trim()}`,
    },
  });

  void notifyOpnameRevisionRequested({
    branchId: opname.branchId,
    opnameId,
    requestedByName: session.user.name ?? 'Owner',
    note: note.trim(),
    createdById: opname.createdById,
  }).catch(() => {});

  revalidatePath('/owner/inventory');
  revalidatePath('/cashier/inventory');
  revalidatePath('/cashier/inbox');
  return { ok: true };
}

/** Detail opname untuk modal riwayat / inbox. */
export async function getStockOpnameDetail(opnameId: string) {
  const session = await requireAuth([...INVENTORY_ROLES, Role.SUPER_ADMIN]);

  const opname = await prisma.stockOpname.findFirst({
    where: {
      id: opnameId,
      branch: { organizationId: session.user.organizationId },
    },
    include: {
      branch: { select: { name: true, code: true } },
      lines: {
        include: {
          item: { select: { name: true, unit: true, sku: true } },
        },
      },
    },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');

  if (session.user.role === Role.CASHIER && opname.branchId !== session.user.branchId) {
    throw new Error('Akses ditolak');
  }

  let submittedBy: string | null = null;
  if (opname.createdById) {
    const creator = await prisma.user.findUnique({
      where: { id: opname.createdById },
      select: { name: true },
    });
    submittedBy = creator?.name ?? null;
  }

  return {
    id: opname.id,
    status: opname.status,
    period: opname.period,
    createdAt: opname.createdAt,
    branchName: opname.branch.name,
    branchCode: opname.branch.code,
    submittedBy,
    cashExpected: opname.cashExpected,
    cashActual: opname.cashActual,
    cashVariance: opname.cashVariance,
    notes: opname.notes,
    lineCount: opname.lines.length,
    totalVarianceCost: opname.lines.reduce((s, l) => s + Math.abs(l.varianceCost ?? 0), 0),
    lines: opname.lines.map((l) => ({
      id: l.id,
      name: l.item.name,
      unit: l.item.unit,
      sku: l.item.sku,
      systemQty: l.systemQty,
      physicalQty: l.physicalQty,
      variance: l.variance,
      varianceCost: l.varianceCost,
    })),
  };
}

export async function cancelStockOpname(opnameId: string, branchId?: string) {
  const { session, branchId: bid, organizationId } = await inventoryCtx(branchId);
  const role = session.user.role as Role;

  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, branchId: bid, status: { in: ['DRAFT', 'COUNTING', 'PENDING_APPROVAL'] } },
  });
  if (!opname) throw new Error('Opname tidak ditemukan');
  if (!canManageOpnameSession(role, opname.createdById, session.user.id)) {
    throw new Error('Anda tidak berhak membatalkan opname ini');
  }

  await prisma.stockOpname.update({
    where: { id: opnameId },
    data: { status: 'CANCELLED', notes: opname.notes ? `${opname.notes} [Dibatalkan]` : 'Dibatalkan' },
  });

  await createAuditLog(
    { organizationId, branchId: bid, userId: session.user.id },
    'STOCK_OPNAME_CREATED',
    'StockOpname',
    opnameId,
    { status: opname.status },
    { status: 'CANCELLED' }
  );

  await dismissOpnameNotifications(opnameId);

  revalidatePath('/owner/inventory');
  revalidatePath('/cashier/inventory');
  revalidatePath('/cashier/inbox');
  return { ok: true };
}

export async function getExpectedBranchCash(branchId?: string) {
  const { branchId: bid } = await inventoryCtx(branchId);
  return computeExpectedBranchCash(bid);
}

export async function getInventorySummary(branchId?: string) {
  const { session, branchId: bid, organizationId } = await inventoryCtx(branchId);
  const role = session.user.role as Role;
  const items = await prisma.inventoryItem.findMany({ where: { branchId: bid } });

  const lowStock = items.filter((i) => i.currentStock <= i.minStock);
  const totalValue = items.reduce((s, i) => s + i.currentStock * (i.unitCost ?? 0), 0);
  const [unfinishedOpname, expectedCash, lastApproved, pendingApprovalCount] = await Promise.all([
    prisma.stockOpname.findFirst({
      where: { branchId: bid, status: { in: ['DRAFT', 'COUNTING', 'PENDING_APPROVAL'] } },
      orderBy: { createdAt: 'desc' },
      include: { lines: { include: { item: { select: { name: true, unit: true, sku: true } } } } },
    }),
    computeExpectedBranchCash(bid),
    prisma.stockOpname.findFirst({
      where: { branchId: bid, status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
      select: { cashActual: true, cashVariance: true, approvedAt: true },
    }),
    prisma.stockOpname.count({
      where: {
        status: 'PENDING_APPROVAL',
        ...(isApprover(role)
          ? { branch: { organizationId } }
          : { branchId: bid }),
      },
    }),
  ]);

  const actualCash = unfinishedOpname?.cashActual ?? lastApproved?.cashActual ?? null;
  const cashVariance = unfinishedOpname?.cashVariance ?? lastApproved?.cashVariance ?? null;

  return {
    itemCount: items.length,
    lowStockCount: lowStock.length,
    totalValue,
    lowStock,
    unfinishedOpname,
    expectedCash,
    actualCash,
    cashVariance,
    pendingApprovalCount,
    lastOpnameApprovedAt: lastApproved?.approvedAt ?? null,
  };
}
