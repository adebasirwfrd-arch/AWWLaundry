import { prisma, Role } from '@aww/database';

export interface SessionUserPayload {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  organizationId: string;
  branchId: string;
  role: string;
  branchName: string;
}

const STAFF_OR_ADMIN_ROLES = new Set<Role>([
  Role.SUPER_ADMIN,
  Role.OWNER,
  Role.MANAGER,
  Role.CASHIER,
  Role.WORKER,
]);

const ROLE_PRIORITY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.OWNER]: 90,
  [Role.MANAGER]: 80,
  [Role.CASHIER]: 70,
  [Role.WORKER]: 60,
  [Role.CUSTOMER]: 10,
};

type BranchRoleRow = {
  branchId: string;
  role: Role;
  branch: { name: string };
};

export function pickPrimaryBranchRole(roles: BranchRoleRow[]): BranchRoleRow | null {
  if (roles.length === 0) return null;
  const staffRoles = roles.filter((row) => STAFF_OR_ADMIN_ROLES.has(row.role));
  const pool = staffRoles.length > 0 ? staffRoles : roles;
  return (
    [...pool].sort((a, b) => {
      const priorityDiff = ROLE_PRIORITY[b.role] - ROLE_PRIORITY[a.role];
      if (priorityDiff !== 0) return priorityDiff;
      return a.branchId.localeCompare(b.branchId);
    })[0] ?? null
  );
}

export async function loadSessionUserByEmail(email: string): Promise<SessionUserPayload | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      branchRoles: { include: { branch: true } },
    },
  });

  if (!user?.isActive) return null;

  const branchRole = pickPrimaryBranchRole(user.branchRoles);
  if (!branchRole) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.avatarUrl,
    organizationId: user.organizationId,
    branchId: branchRole.branchId,
    role: branchRole.role,
    branchName: branchRole.branch.name,
  };
}

export async function loadSessionUserById(id: string): Promise<SessionUserPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true },
  });
  if (!user) return null;
  return loadSessionUserByEmail(user.email);
}

/** After staff access is revoked, ensure the user can still log in as pelanggan. */
export async function ensureCustomerFallback(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branchRoles: true, customer: true },
  });
  if (!user) return;

  const hasStaffOrAdmin = user.branchRoles.some((r) => STAFF_OR_ADMIN_ROLES.has(r.role));
  if (hasStaffOrAdmin) return;

  const branch = await prisma.branch.findFirst({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!branch) return;

  const hasCustomerRole = user.branchRoles.some((r) => r.role === Role.CUSTOMER);
  if (!hasCustomerRole) {
    await prisma.userBranchRole.create({
      data: { userId, branchId: branch.id, role: Role.CUSTOMER },
    });
  }

  if (!user.customer) {
    await prisma.customer.create({
      data: {
        organizationId: user.organizationId,
        userId,
        name: user.name,
        phone: user.phone ?? `USR-${userId.slice(-8)}`,
        email: user.email,
      },
    });
  }
}
