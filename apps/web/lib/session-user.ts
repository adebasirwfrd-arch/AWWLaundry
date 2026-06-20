import { prisma } from '@aww/database';

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

export async function loadSessionUserByEmail(email: string): Promise<SessionUserPayload | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      branchRoles: { include: { branch: true }, take: 1 },
    },
  });

  if (!user?.isActive) return null;

  const branchRole = user.branchRoles[0];
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
    include: {
      branchRoles: { include: { branch: true }, take: 1 },
    },
  });
  if (!user?.isActive) return null;
  return loadSessionUserByEmail(user.email);
}
