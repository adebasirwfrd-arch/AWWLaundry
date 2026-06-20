// Staff dashboard pages use Prisma + session — always server-rendered.
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
