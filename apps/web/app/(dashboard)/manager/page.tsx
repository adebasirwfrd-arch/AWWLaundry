import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { redirect } from 'next/navigation';
import { getDashboardPath } from '@/lib/auth';

export default async function ManagerPage() {
  const session = await requireAuth([Role.MANAGER]);
  if (session.user.role === Role.MANAGER) {
    redirect('/owner');
  }
  redirect(getDashboardPath(session.user.role));
}
