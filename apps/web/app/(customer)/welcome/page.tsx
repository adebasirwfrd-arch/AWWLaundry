import { prisma } from '@aww/database';
import { CustomerNav } from '@/components/customer/customer-nav';
import { CustomerLanding } from '@/components/customer/customer-landing';

export const metadata = {
  title: 'AWW Laundry — Laundry Antar-Jemput Tanpa Repot',
  description: 'Pesan jemput, cuci bersih wangi, antar balik. Pantau cucian real-time. FRESH • CLEAN • FUN',
};

export default async function WelcomePage() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const services = org
    ? await prisma.serviceType.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { pricePerKg: 'asc' },
      })
    : [];

  return (
    <>
      <CustomerNav />
      <CustomerLanding
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          pricePerKg: s.pricePerKg,
          estimatedHours: s.estimatedHours,
        }))}
      />
    </>
  );
}
