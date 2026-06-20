import { auth } from './auth';
import { Role } from '@aww/database';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';

export async function requireAuth(allowedRoles?: Role[]) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    redirect('/unauthorized');
  }
  return session as Session & { user: NonNullable<Session['user']> & {
    id: string;
    organizationId: string;
    branchId: string;
    role: Role;
    branchName: string;
  }};
}

export async function getSession() {
  return auth();
}
