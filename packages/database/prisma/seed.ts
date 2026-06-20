import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

  const branch = await prisma.branch.upsert({
    where: { id: 'seed-branch-01' },
    update: {},
    create: {
      id: 'seed-branch-01',
      organizationId: org.id,
      code: 'JKT01',
      name: 'AWW Laundry Jakarta Selatan',
      address: 'Jl. Sudirman No. 123, Jakarta Selatan',
      phone: '021-12345678',
    },
  });

  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    { email: 'owner@awwlaundry.com', name: 'Ade Azhar', role: Role.OWNER },
    { email: 'manager@awwlaundry.com', name: 'Budi Manager', role: Role.MANAGER },
    { email: 'kasir@awwlaundry.com', name: 'Siti Kasir', role: Role.CASHIER },
    { email: 'worker@awwlaundry.com', name: 'Andi Worker', role: Role.WORKER },
    { email: 'pelanggan@awwlaundry.com', name: 'Rina Pelanggan', role: Role.CUSTOMER },
  ];

  for (const u of users) {
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

    await prisma.userBranchRole.upsert({
      where: { userId_branchId: { userId: user.id, branchId: branch.id } },
      update: { role: u.role },
      create: {
        userId: user.id,
        branchId: branch.id,
        role: u.role,
        permissions: '[]',
      },
    });

    // Link a Customer profile to the customer-role user for self-ordering.
    if (u.role === Role.CUSTOMER) {
      const existingCust = await prisma.customer.findUnique({ where: { userId: user.id } });
      if (!existingCust) {
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
  }

  const services = [
    { name: 'Cuci Kering', pricePerKg: 8000, estimatedHours: 24 },
    { name: 'Cuci Setrika', pricePerKg: 12000, estimatedHours: 48 },
    { name: 'Cuci Express', pricePerKg: 15000, estimatedHours: 6 },
    { name: 'Dry Clean', pricePerKg: 25000, estimatedHours: 72 },
  ];

  const serviceTypes = [];
  for (const s of services) {
    const existing = await prisma.serviceType.findFirst({
      where: { organizationId: org.id, name: s.name },
    });
    const st = existing ?? await prisma.serviceType.create({
      data: { organizationId: org.id, ...s },
    });
    serviceTypes.push(st);

    await prisma.branchPricing.upsert({
      where: {
        branchId_serviceTypeId: { branchId: branch.id, serviceTypeId: st.id },
      },
      update: { pricePerKg: s.pricePerKg },
      create: { branchId: branch.id, serviceTypeId: st.id, pricePerKg: s.pricePerKg },
    });
  }

  const customers = [
    { name: 'Budi Santoso', phone: '081234567890' },
    { name: 'Ani Wijaya', phone: '081298765432' },
    { name: 'Rudi Hartono', phone: '085678901234' },
    { name: 'Dewi Lestari', phone: '087654321098' },
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

  const kasir = await prisma.user.findUnique({ where: { email: 'kasir@awwlaundry.com' } });
  if (!kasir) throw new Error('Kasir not found');

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
        branchId: branch.id,
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
        createdById: kasir.id,
        statusLogs: {
          create: {
            fromStatus: null,
            toStatus: 'RECEIVED',
            changedById: kasir.id,
            note: 'Order diterima di kasir',
          },
        },
        payments: {
              create: {
                branchId: branch.id,
                amount: subtotal,
                method: i % 2 === 0 ? 'CASH' : 'QRIS',
                receivedById: kasir.id,
              },
            },
      },
    });
  }

  const machines = [
    { name: 'Mesin Cuci 1', type: 'WASHER', capacityKg: 15 },
    { name: 'Mesin Cuci 2', type: 'WASHER', capacityKg: 10 },
    { name: 'Pengering 1', type: 'DRYER', capacityKg: 12 },
    { name: 'Setrika Uap', type: 'IRON', capacityKg: null },
  ];

  for (const m of machines) {
    const existing = await prisma.machine.findFirst({
      where: { branchId: branch.id, name: m.name },
    });
    if (!existing) {
      await prisma.machine.create({
        data: { branchId: branch.id, ...m, status: 'IDLE' },
      });
    }
  }

  const inventory = [
    { name: 'Deterjen', unit: 'liter', currentStock: 25, minStock: 5 },
    { name: 'Pewangi', unit: 'liter', currentStock: 15, minStock: 3 },
    { name: 'Plastik Kemasan', unit: 'pack', currentStock: 50, minStock: 10 },
    { name: 'Kantong Laundry', unit: 'pcs', currentStock: 200, minStock: 50 },
  ];

  for (const item of inventory) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { branchId: branch.id, name: item.name },
    });
    if (!existing) {
      await prisma.inventoryItem.create({ data: { branchId: branch.id, ...item } });
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const ordersToday = await prisma.order.count({
    where: { branchId: branch.id, createdAt: { gte: todayStart } },
  });
  const readyToday = await prisma.order.count({
    where: { branchId: branch.id, readyAt: { gte: todayStart } },
  });
  const revenueToday = await prisma.payment.aggregate({
    where: { branchId: branch.id, paidAt: { gte: todayStart } },
    _sum: { amount: true },
  });

  await prisma.dailyBranchSummary.upsert({
    where: { branchId_date: { branchId: branch.id, date: todayStart } },
    update: {
      metrics: JSON.stringify({
        ordersIn: ordersToday,
        ordersReady: readyToday,
        ordersPickedUp: 0,
        revenue: revenueToday._sum.amount ?? 0,
        totalWeightIn: 18.5,
        unpaidTotal: 0,
      }),
    },
    create: {
      branchId: branch.id,
      date: todayStart,
      metrics: JSON.stringify({
        ordersIn: ordersToday,
        ordersReady: readyToday,
        ordersPickedUp: 0,
        revenue: revenueToday._sum.amount ?? 0,
        totalWeightIn: 18.5,
        unpaidTotal: 0,
      }),
    },
  });

  // Perbaiki data tidak konsisten: belum bayar tidak boleh sudah masuk produksi
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
  console.log('   Login: kasir@awwlaundry.com / password123');
  console.log('   Roles: owner@, manager@, kasir@, worker@awwlaundry.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
