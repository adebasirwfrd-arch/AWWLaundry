import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type ServiceTypeRow = { id: string; name: string; pricePerKg: number; estimatedHours: number };

async function seedBranchPricing(branchId: string, serviceTypes: ServiceTypeRow[]) {
  for (const st of serviceTypes) {
    await prisma.branchPricing.upsert({
      where: { branchId_serviceTypeId: { branchId, serviceTypeId: st.id } },
      update: { pricePerKg: st.pricePerKg },
      create: { branchId, serviceTypeId: st.id, pricePerKg: st.pricePerKg },
    });
  }
}

async function seedBranchInventory(branchId: string) {
  const inventory = [
    { sku: 'DET-001', name: 'Deterjen', category: 'Chemical', unit: 'liter', unitCost: 45000, currentStock: 25, minStock: 5 },
    { sku: 'PEW-001', name: 'Pewangi', category: 'Chemical', unit: 'liter', unitCost: 35000, currentStock: 15, minStock: 3 },
    { sku: 'PLS-001', name: 'Plastik Kemasan', category: 'Packaging', unit: 'pack', unitCost: 12000, currentStock: 50, minStock: 10 },
    { sku: 'KNT-001', name: 'Kantong Laundry', category: 'Packaging', unit: 'pcs', unitCost: 500, currentStock: 200, minStock: 50 },
    { sku: 'SOF-001', name: 'Softener', category: 'Chemical', unit: 'liter', unitCost: 28000, currentStock: 8, minStock: 5 },
  ];

  for (const item of inventory) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { branchId, sku: item.sku },
    });
    if (!existing) {
      await prisma.inventoryItem.create({ data: { branchId, ...item } });
    }
  }
}

async function seedBranchMachines(branchId: string) {
  const machines = [
    { name: 'Mesin Cuci 1', type: 'WASHER', capacityKg: 15 },
    { name: 'Mesin Cuci 2', type: 'WASHER', capacityKg: 10 },
    { name: 'Pengering 1', type: 'DRYER', capacityKg: 12 },
    { name: 'Setrika Uap', type: 'IRON', capacityKg: null },
  ];
  for (const m of machines) {
    const existing = await prisma.machine.findFirst({ where: { branchId, name: m.name } });
    if (!existing) {
      await prisma.machine.create({ data: { branchId, ...m, status: 'IDLE' } });
    }
  }
}

async function seedBranchOrders(
  branch: { id: string; code: string },
  serviceTypes: ServiceTypeRow[],
  customerRecords: { id: string }[],
  kasirId: string,
  count = 4
) {
  const today = new Date();
  const statuses = ['RECEIVED', 'WASHING', 'DRYING', 'READY'] as const;

  for (let i = 0; i < count; i++) {
    const cust = customerRecords[i % customerRecords.length];
    const svc = serviceTypes[i % serviceTypes.length];
    const weight = 2 + i * 0.8;
    const subtotal = weight * svc.pricePerKg;
    const orderNum = `${branch.code}-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${String(200 + i).padStart(4, '0')}`;

    const existing = await prisma.order.findUnique({ where: { orderNumber: orderNum } });
    if (existing) continue;

    const estimatedReady = new Date(today);
    estimatedReady.setHours(estimatedReady.getHours() + svc.estimatedHours);

    await prisma.order.create({
      data: {
        branchId: branch.id,
        customerId: cust.id,
        orderNumber: orderNum,
        weightKg: weight,
        serviceTypeId: svc.id,
        subtotal,
        total: subtotal,
        status: statuses[i % statuses.length],
        paymentStatus: 'PAID',
        estimatedReadyAt: estimatedReady,
        readyAt: statuses[i % statuses.length] === 'READY' ? today : null,
        createdById: kasirId,
        statusLogs: {
          create: {
            fromStatus: null,
            toStatus: 'RECEIVED',
            changedById: kasirId,
            note: 'Order diterima di kasir',
          },
        },
        payments: {
          create: {
            branchId: branch.id,
            amount: subtotal,
            method: i % 2 === 0 ? 'CASH' : 'QRIS',
            receivedById: kasirId,
          },
        },
      },
    });
  }
}

async function seedDailySummary(branchId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersToday, readyToday, revenueToday] = await Promise.all([
    prisma.order.count({ where: { branchId, createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { branchId, readyAt: { gte: todayStart } } }),
    prisma.payment.aggregate({ where: { branchId, paidAt: { gte: todayStart } }, _sum: { amount: true } }),
  ]);

  await prisma.dailyBranchSummary.upsert({
    where: { branchId_date: { branchId, date: todayStart } },
    update: {
      metrics: JSON.stringify({
        ordersIn: ordersToday,
        ordersReady: readyToday,
        ordersPickedUp: 0,
        revenue: revenueToday._sum.amount ?? 0,
        totalWeightIn: ordersToday * 3.2,
        unpaidTotal: 0,
      }),
    },
    create: {
      branchId,
      date: todayStart,
      metrics: JSON.stringify({
        ordersIn: ordersToday,
        ordersReady: readyToday,
        ordersPickedUp: 0,
        revenue: revenueToday._sum.amount ?? 0,
        totalWeightIn: ordersToday * 3.2,
        unpaidTotal: 0,
      }),
    },
  });
}

async function assignUserToBranch(
  userId: string,
  branchId: string,
  role: Role,
  passwordHash: string,
  userData?: { email: string; name: string; organizationId: string }
) {
  if (userData) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        organizationId: userData.organizationId,
        email: userData.email,
        name: userData.name,
        passwordHash,
        emailVerified: true,
        profileCompleted: true,
      },
    });
    const user = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!user) throw new Error(`User ${userData.email} not found`);
    userId = user.id;
  }

  await prisma.userBranchRole.upsert({
    where: { userId_branchId: { userId, branchId } },
    update: { role },
    create: { userId, branchId, role, permissions: '[]' },
  });

  return userId;
}

async function main() {
  console.log('🧺 Seeding AWW Laundry database...');

  const org = await prisma.organization.upsert({
    where: { slug: 'aww-laundry' },
    update: {},
    create: {
      name: 'AWW Laundry Franchise',
      slug: 'aww-laundry',
      settings: JSON.stringify({ tagline: 'FRESH • CLEAN • FUN' }),
    },
  });

  const branches = [
    {
      id: 'seed-branch-01',
      code: 'JKT01',
      name: 'AWW Laundry Jakarta Selatan',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      phone: '021-12345678',
    },
    {
      id: 'seed-branch-02',
      code: 'JKT02',
      name: 'AWW Laundry Jakarta Timur',
      address: 'Jl. Raya Condet No. 45, Jakarta Timur',
      phone: '021-87654321',
    },
    {
      id: 'seed-branch-03',
      code: 'BDG01',
      name: 'AWW Laundry Bandung',
      address: 'Jl. Dago No. 88, Bandung',
      phone: '022-11223344',
    },
  ];

  const branchRecords = [];
  for (const b of branches) {
    const branch = await prisma.branch.upsert({
      where: { id: b.id },
      update: { name: b.name, address: b.address, phone: b.phone },
      create: { ...b, organizationId: org.id },
    });
    branchRecords.push(branch);
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const coreUsers = [
    { email: 'owner@awwlaundry.com', name: 'Ade Azhar', role: Role.OWNER },
    { email: 'manager@awwlaundry.com', name: 'Budi Manager', role: Role.MANAGER },
    { email: 'kasir@awwlaundry.com', name: 'Siti Kasir', role: Role.CASHIER },
    { email: 'worker@awwlaundry.com', name: 'Andi Worker', role: Role.WORKER },
    { email: 'pelanggan@awwlaundry.com', name: 'Rina Pelanggan', role: Role.CUSTOMER },
  ];

  const owner = await prisma.user.upsert({
    where: { email: 'owner@awwlaundry.com' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'owner@awwlaundry.com',
      name: 'Ade Azhar',
      passwordHash,
      emailVerified: true,
      profileCompleted: true,
    },
  });

  for (const branch of branchRecords) {
    await assignUserToBranch(owner.id, branch.id, Role.OWNER);
  }

  for (const u of coreUsers) {
    if (u.role === Role.OWNER) continue;
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        organizationId: org.id,
        email: u.email,
        name: u.name,
        phone: u.role === Role.CUSTOMER ? '081200001234' : undefined,
        passwordHash,
        emailVerified: true,
        profileCompleted: true,
      },
    });

    await assignUserToBranch(user.id, branchRecords[0].id, u.role);

    if (u.role === Role.CUSTOMER) {
      await prisma.customer.upsert({
        where: { organizationId_phone: { organizationId: org.id, phone: '081200001234' } },
        update: { userId: user.id },
        create: {
          organizationId: org.id,
          userId: user.id,
          name: u.name,
          phone: '081200001234',
          email: u.email,
          address: 'Jl. Melati No. 8, Jakarta Selatan',
        },
      });
    }
  }

  const branchStaff = [
    { branchId: 'seed-branch-02', email: 'manager.jkt02@awwlaundry.com', name: 'Dedi Manager JKT02', role: Role.MANAGER },
    { branchId: 'seed-branch-02', email: 'kasir.jkt02@awwlaundry.com', name: 'Maya Kasir JKT02', role: Role.CASHIER },
    { branchId: 'seed-branch-02', email: 'worker.jkt02@awwlaundry.com', name: 'Joko Worker JKT02', role: Role.WORKER },
    { branchId: 'seed-branch-03', email: 'manager.bdg01@awwlaundry.com', name: 'Citra Manager BDG', role: Role.MANAGER },
    { branchId: 'seed-branch-03', email: 'kasir.bdg01@awwlaundry.com', name: 'Riko Kasir BDG', role: Role.CASHIER },
    { branchId: 'seed-branch-03', email: 'worker.bdg01@awwlaundry.com', name: 'Yoga Worker BDG', role: Role.WORKER },
  ];

  for (const s of branchStaff) {
    await assignUserToBranch('', s.branchId, s.role, passwordHash, {
      email: s.email,
      name: s.name,
      organizationId: org.id,
    });
  }

  const services = [
    { name: 'Cuci Kering', pricePerKg: 8000, estimatedHours: 24 },
    { name: 'Cuci Setrika', pricePerKg: 12000, estimatedHours: 48 },
    { name: 'Cuci Express', pricePerKg: 15000, estimatedHours: 6 },
    { name: 'Dry Clean', pricePerKg: 25000, estimatedHours: 72 },
  ];

  const serviceTypes: ServiceTypeRow[] = [];
  for (const s of services) {
    const existing = await prisma.serviceType.findFirst({
      where: { organizationId: org.id, name: s.name },
    });
    const st = existing ?? (await prisma.serviceType.create({ data: { organizationId: org.id, ...s } }));
    serviceTypes.push(st);
  }

  for (const branch of branchRecords) {
    await seedBranchPricing(branch.id, serviceTypes);
    await seedBranchInventory(branch.id);
    await seedBranchMachines(branch.id);
  }

  const customers = [
    { name: 'Budi Santoso', phone: '081234567890' },
    { name: 'Ani Wijaya', phone: '081298765432' },
    { name: 'Rudi Hartono', phone: '085678901234' },
    { name: 'Dewi Lestari', phone: '087654321098' },
    { name: 'Eko Prasetyo', phone: '081112223334' },
    { name: 'Fitri Handayani', phone: '085556667778' },
  ];

  const customerRecords = [];
  for (const c of customers) {
    const cust = await prisma.customer.upsert({
      where: { organizationId_phone: { organizationId: org.id, phone: c.phone } },
      update: {},
      create: { organizationId: org.id, ...c },
    });
    customerRecords.push(cust);
  }

  const kasirJkt01 = await prisma.user.findUnique({ where: { email: 'kasir@awwlaundry.com' } });
  const kasirJkt02 = await prisma.user.findUnique({ where: { email: 'kasir.jkt02@awwlaundry.com' } });
  const kasirBdg01 = await prisma.user.findUnique({ where: { email: 'kasir.bdg01@awwlaundry.com' } });
  if (!kasirJkt01 || !kasirJkt02 || !kasirBdg01) throw new Error('Kasir not found');

  const today = new Date();
  const statuses = ['RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'FOLDING', 'READY'] as const;

  for (let i = 0; i < 6; i++) {
    const cust = customerRecords[i % customerRecords.length];
    const svc = serviceTypes[i % serviceTypes.length];
    const weight = 2.5 + i * 0.5;
    const subtotal = weight * svc.pricePerKg;
    const orderNum = `JKT01-${today.toISOString().slice(0, 10).replace(/-/g, '')}-${String(100 + i).padStart(4, '0')}`;

    const existing = await prisma.order.findUnique({ where: { orderNumber: orderNum } });
    if (existing) continue;

    const estimatedReady = new Date(today);
    estimatedReady.setHours(estimatedReady.getHours() + svc.estimatedHours);

    await prisma.order.create({
      data: {
        branchId: branchRecords[0].id,
        customerId: cust.id,
        orderNumber: orderNum,
        weightKg: weight,
        serviceTypeId: svc.id,
        subtotal,
        total: subtotal,
        status: statuses[i],
        paymentStatus: 'PAID',
        estimatedReadyAt: estimatedReady,
        readyAt: statuses[i] === 'READY' ? today : null,
        createdById: kasirJkt01.id,
        statusLogs: {
          create: {
            fromStatus: null,
            toStatus: 'RECEIVED',
            changedById: kasirJkt01.id,
            note: 'Order diterima di kasir',
          },
        },
        payments: {
          create: {
            branchId: branchRecords[0].id,
            amount: subtotal,
            method: i % 2 === 0 ? 'CASH' : 'QRIS',
            receivedById: kasirJkt01.id,
          },
        },
      },
    });
  }

  await seedBranchOrders(branchRecords[1], serviceTypes, customerRecords, kasirJkt02.id, 5);
  await seedBranchOrders(branchRecords[2], serviceTypes, customerRecords, kasirBdg01.id, 5);

  for (const branch of branchRecords) {
    await seedDailySummary(branch.id);
  }

  const repaired = await prisma.order.updateMany({
    where: {
      paymentStatus: { not: 'PAID' },
      status: { notIn: ['ON_HOLD', 'CANCELLED'] },
    },
    data: { status: 'ON_HOLD' },
  });
  if (repaired.count > 0) {
    console.log(`   🔧 Repaired ${repaired.count} unpaid order(s) → ON_HOLD`);
  }

  console.log('✅ Seed complete!');
  console.log(`   ${branchRecords.length} cabang: JKT01, JKT02, BDG01`);
  console.log('   Login: owner@awwlaundry.com / password123');
  console.log('   Cabang JKT02: kasir.jkt02@ / manager.jkt02@ / worker.jkt02@');
  console.log('   Cabang BDG01: kasir.bdg01@ / manager.bdg01@ / worker.bdg01@');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
