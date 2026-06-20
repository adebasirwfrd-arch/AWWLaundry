/** Role constants — safe untuk import di Client Components (tanpa Prisma). */
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  WORKER: 'WORKER',
  CUSTOMER: 'CUSTOMER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
