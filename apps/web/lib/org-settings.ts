import { prisma } from '@aww/database';
import { CATALOG, type CatalogCategory, type CatalogItem } from '@/lib/customer-catalog';
import {
  LOYALTY_APP_ORDER_BONUS,
  LOYALTY_POINTS_PER_KG,
  LOYALTY_REDEEM_COST,
} from '@aww/shared';

export interface LoyaltySettings {
  pointsPerKg: number;
  appOrderBonus: number;
  redeemCost: number;
}

export interface OrgSettingsData {
  tagline: string;
  loyalty: LoyaltySettings;
  catalog: CatalogCategory[];
}

const DEFAULT_SETTINGS: OrgSettingsData = {
  tagline: 'FRESH • CLEAN • FUN',
  loyalty: {
    pointsPerKg: LOYALTY_POINTS_PER_KG,
    appOrderBonus: LOYALTY_APP_ORDER_BONUS,
    redeemCost: LOYALTY_REDEEM_COST,
  },
  catalog: CATALOG,
};

export function parseOrgSettings(raw: string | null | undefined): OrgSettingsData {
  if (!raw) return { ...DEFAULT_SETTINGS, catalog: [...CATALOG] };
  try {
    const parsed = JSON.parse(raw) as Partial<OrgSettingsData>;
    return {
      tagline: parsed.tagline ?? DEFAULT_SETTINGS.tagline,
      loyalty: { ...DEFAULT_SETTINGS.loyalty, ...parsed.loyalty },
      catalog: parsed.catalog?.length ? parsed.catalog : [...CATALOG],
    };
  } catch {
    return { ...DEFAULT_SETTINGS, catalog: [...CATALOG] };
  }
}

export async function getOrgSettings(organizationId: string): Promise<OrgSettingsData> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  return parseOrgSettings(org?.settings);
}

export async function saveOrgSettings(organizationId: string, data: OrgSettingsData) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: JSON.stringify(data) },
  });
}

export async function getCatalogForOrg(organizationId: string): Promise<CatalogCategory[]> {
  const settings = await getOrgSettings(organizationId);
  return settings.catalog.filter((c) => c.items !== undefined);
}

export async function getCategoryForOrg(
  organizationId: string,
  slug: string
): Promise<CatalogCategory | undefined> {
  const catalog = await getCatalogForOrg(organizationId);
  return catalog.find((c) => c.slug === slug);
}

/** Sinkronkan katalog ke ServiceType agar kasir/POS pakai harga terbaru. */
export async function syncCatalogToServiceTypes(organizationId: string, catalog: CatalogCategory[]) {
  for (const cat of catalog) {
    const existing = await prisma.serviceType.findFirst({
      where: { organizationId, name: cat.title },
    });
    if (existing) {
      await prisma.serviceType.update({
        where: { id: existing.id },
        data: {
          pricePerKg: cat.pricePerKg,
          estimatedHours: cat.estimatedHours,
          isActive: true,
        },
      });
    } else {
      await prisma.serviceType.create({
        data: {
          organizationId,
          name: cat.title,
          pricePerKg: cat.pricePerKg,
          estimatedHours: cat.estimatedHours,
        },
      });
    }
  }
}

export type { CatalogCategory, CatalogItem };
