'use server';

import { prisma } from '@aww/database';

function genTrackingCode(): string {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PJ-${date}-${rand}`;
}

export async function createPickupRequest(data: {
  customerName: string;
  customerPhone: string;
  address: string;
  serviceName: string;
  scheduleDate: string;
  scheduleSlot: string;
  estimatedKg?: number;
  notes?: string;
}) {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!org) throw new Error('Organisasi tidak ditemukan');

  const branch = await prisma.branch.findFirst({
    where: { organizationId: org.id, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  const trackingCode = genTrackingCode();

  const request = await prisma.pickupRequest.create({
    data: {
      organizationId: org.id,
      branchId: branch?.id,
      trackingCode,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      address: data.address,
      serviceName: data.serviceName,
      scheduleDate: data.scheduleDate,
      scheduleSlot: data.scheduleSlot,
      estimatedKg: data.estimatedKg,
      notes: data.notes,
    },
  });

  return {
    trackingCode: request.trackingCode,
    branchName: branch?.name ?? 'AWW Laundry',
    branchPhone: branch?.phone ?? null,
  };
}
