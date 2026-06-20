import { lastNDays, sameCalendarDay, formatDayLabel, sevenDaysAgo } from '@/lib/date-buckets';

export function buildRatingChartData(
  reviews: { rating: number; createdAt: Date }[]
) {
  const days = lastNDays(7);
  return days.map((day) => {
    const dayReviews = reviews.filter((r) => sameCalendarDay(new Date(r.createdAt), day));
    const count = dayReviews.length;
    const avgRating =
      count > 0 ? Math.round((dayReviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
    return { date: formatDayLabel(day), count, avgRating };
  });
}

export function buildRedeemChartData(
  orders: { customerId: string; loyaltyPointsRedeemed: number; createdAt: Date }[]
) {
  const days = lastNDays(7);
  return days.map((day) => {
    const dayOrders = orders.filter((o) => sameCalendarDay(new Date(o.createdAt), day));
    return {
      date: formatDayLabel(day),
      users: new Set(dayOrders.map((o) => o.customerId)).size,
      points: dayOrders.reduce((s, o) => s + o.loyaltyPointsRedeemed, 0),
    };
  });
}

export function buildRatingDistribution(reviews: { rating: number }[]) {
  return [1, 2, 3, 4, 5].map((star) => ({
    star: `${star}★`,
    count: reviews.filter((r) => r.rating === star).length,
  }));
}

export { sevenDaysAgo };
