import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Simpan singleton di semua environment agar koneksi Prisma tidak dibuat ulang tiap cold start Vercel.
globalForPrisma.prisma = prisma;

export * from '@prisma/client';
