import { Role, prisma } from '@aww/database';
import { isOwnerLikeRole } from '@/lib/api-access-user';

export type StaffSession = {
  role: Role;
  branchId: string;
  organizationId: string;
};

/** Owner & super admin — akses semua cabang dalam organisasi. */
export function hasOrgWideBranchAccess(role: Role | string): boolean {
  return isOwnerLikeRole(String(role));
}

/** Kasir & pekerja — terkunci ke satu cabang saja. */
export function isBranchLockedStaff(role: Role | string): boolean {
  const r = String(role).toUpperCase();
  return r === Role.CASHIER || r === Role.WORKER;
}

/** Filter Prisma untuk entitas yang punya branchId langsung. */
export function directBranchWhere(session: StaffSession) {
  if (hasOrgWideBranchAccess(session.role)) {
    return { branch: { organizationId: session.organizationId } };
  }
  return { branchId: session.branchId };
}

/** Filter Prisma untuk relasi order.branch. */
export function orderBranchWhere(session: StaffSession) {
  if (hasOrgWideBranchAccess(session.role)) {
    return { branch: { organizationId: session.organizationId } };
  }
  return { branchId: session.branchId };
}

export function assertStaffOrderBranch(orderBranchId: string, session: StaffSession) {
  if (hasOrgWideBranchAccess(session.role)) return;
  if (orderBranchId !== session.branchId) {
    throw new Error('Pesanan hanya bisa diproses di cabang Anda');
  }
}

export async function assertStaffOrderBranchInOrg(
  orderBranchId: string,
  session: StaffSession
) {
  if (hasOrgWideBranchAccess(session.role)) {
    const branch = await prisma.branch.findFirst({
      where: { id: orderBranchId, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!branch) throw new Error('Pesanan tidak ditemukan');
    return;
  }
  assertStaffOrderBranch(orderBranchId, session);
}
