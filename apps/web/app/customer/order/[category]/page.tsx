import { notFound } from 'next/navigation';
import { prisma, Role } from '@aww/database';
import { requireAuth } from '@/lib/session';
import { getCategoryForOrg, getOrgSettings } from '@/lib/org-settings';
import { OrderBuilder } from '@/components/customer/order-builder';

export default async function OrderCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const session = await requireAuth([Role.CUSTOMER]);
  const orgId = session.user.organizationId;
  const cat = await getCategoryForOrg(orgId, category);
  if (!cat) notFound();

  const serviceType = await prisma.serviceType.findFirst({
    where: { organizationId: orgId, name: cat.title },
  });

  const [customer, orgSettings, rawBranches] = await Promise.all([
    prisma.customer.findUnique({
      where: { userId: session.user.id },
      select: { loyaltyPoints: true },
    }),
    getOrgSettings(orgId),
    prisma.branch.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        branchPricing: serviceType
          ? { where: { serviceTypeId: serviceType.id }, select: { pricePerKg: true } }
          : { take: 0, select: { pricePerKg: true } },
      },
    }),
  ]);

  const branches = rawBranches.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    pricePerKg: b.branchPricing[0]?.pricePerKg ?? serviceType?.pricePerKg ?? cat.pricePerKg,
  }));

  if (branches.length === 0) notFound();

  return (
    <OrderBuilder
      category={cat}
      branches={branches}
      loyaltyPoints={customer?.loyaltyPoints ?? 0}
      loyaltyConfig={orgSettings.loyalty}
    />
  );
}
