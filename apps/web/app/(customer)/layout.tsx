// Public customer pages query Prisma — must not static-prerender at build time.
export const dynamic = 'force-dynamic';

export default function CustomerPublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
