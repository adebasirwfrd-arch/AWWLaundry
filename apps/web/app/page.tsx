import { redirect } from 'next/navigation';
import { auth, getDashboardPath } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(getDashboardPath(session.user.role));
  }
  redirect('/login');
}
