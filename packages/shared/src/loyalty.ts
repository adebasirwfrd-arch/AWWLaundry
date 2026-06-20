/** 10 poin per kg cucian yang sudah dibayar & dikonfirmasi. */
export const LOYALTY_POINTS_PER_KG = 10;

/** Bonus tetap untuk setiap pesanan via aplikasi (setelah kasir konfirmasi). */
export const LOYALTY_APP_ORDER_BONUS = 2;

/** 100 poin = gratis cuci 1 kg. Setara total cuci ~10 kg. */
export const LOYALTY_REDEEM_COST = 100;

export const LOYALTY_REDEEM_FREE_KG = 1;

export function pointsFromWeightKg(weightKg: number): number {
  if (weightKg <= 0) return 0;
  return Math.floor(weightKg * LOYALTY_POINTS_PER_KG);
}

export function canRedeemFreeKg(points: number): boolean {
  return points >= LOYALTY_REDEEM_COST;
}

export function redemptionDiscount(pricePerKg: number): number {
  return Math.round(pricePerKg * LOYALTY_REDEEM_FREE_KG);
}

export function kgNeededForRedemption(): number {
  return LOYALTY_REDEEM_COST / LOYALTY_POINTS_PER_KG;
}
