import { prisma } from '@aww/database';
import { BookingFlow } from '@/components/customer/booking-flow';

export const metadata = {
  title: 'Pesan Jemput — AWW Laundry',
  description: 'Pesan antar-jemput laundry. Pilih layanan, jadwal, dan alamat.',
};

export default async function BookPage() {
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  const services = org
    ? await prisma.serviceType.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: { pricePerKg: 'asc' },
      })
    : [];

  return (
    <BookingFlow
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        pricePerKg: s.pricePerKg,
        estimatedHours: s.estimatedHours,
      }))}
    />
  );
}
