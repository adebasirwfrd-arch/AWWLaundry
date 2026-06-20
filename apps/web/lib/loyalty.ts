import type { Prisma } from '@aww/database';
import { pointsFromWeightKg, LOYALTY_APP_ORDER_BONUS } from '@aww/shared';
import { getOrgSettings } from './org-settings';

type Tx = Prisma.TransactionClient;

/** Bonus pesanan via aplikasi — hanya sekali setelah kasir konfirmasi. */
export async function awardAppOrderBonus(
  tx: Tx,
  orderId: string,
  customerId: string,
  organizationId?: string
): Promise<number> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { fromApp: true, loyaltyAppBonusEarned: true, branchId: true },
  });
  if (!order?.fromApp || order.loyaltyAppBonusEarned > 0) return 0;

  let bonus = LOYALTY_APP_ORDER_BONUS;
  if (organizationId) {
    const settings = await getOrgSettings(organizationId);
    bonus = settings.loyalty.appOrderBonus;
  }

  await tx.order.update({
    where: { id: orderId },
    data: { loyaltyAppBonusEarned: bonus },
  });

  await tx.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { increment: bonus } },
  });

  return bonus;
}

/** Tambah poin ke pelanggan setelah cucian dikonfirmasi & dibayar (sekali per pesanan). */
export async function awardLoyaltyPointsForOrder(
  tx: Tx,
  orderId: string,
  customerId: string,
  weightKg: number
): Promise<number> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { loyaltyPointsEarned: true },
  });
  if (!order || order.loyaltyPointsEarned > 0) return 0;

  const earned = pointsFromWeightKg(weightKg);
  if (earned <= 0) return 0;

  await tx.order.update({
    where: { id: orderId },
    data: { loyaltyPointsEarned: earned },
  });

  await tx.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { increment: earned } },
  });

  return earned;
}

/** Kembalikan poin yang dipakai redeem jika pesanan dibatalkan. */
export async function refundRedeemedPoints(
  tx: Tx,
  orderId: string,
  customerId: string
): Promise<number> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { loyaltyPointsRedeemed: true },
  });
  if (!order || order.loyaltyPointsRedeemed <= 0) return 0;

  const refund = order.loyaltyPointsRedeemed;

  await tx.customer.update({
    where: { id: customerId },
    data: { loyaltyPoints: { increment: refund } },
  });

  await tx.order.update({
    where: { id: orderId },
    data: { loyaltyPointsRedeemed: 0, discount: 0 },
  });

  return refund;
}
