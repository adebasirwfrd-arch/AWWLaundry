import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogCategory } from '@/lib/customer-catalog';
import { getCategoryStyle } from '@/components/customer/category-styles';

export function ServiceCategoryCard({
  category,
  minPriceLabel,
}: {
  category: CatalogCategory;
  minPriceLabel: string;
}) {
  const style = getCategoryStyle(category.slug);

  return (
    <Link
      href={`/customer/order/${category.slug}`}
      className={cn(
        'group relative flex h-full flex-col justify-between rounded-3xl border bg-white p-4 transition-all hover:-translate-y-1 hover:shadow-aww-md',
        style.cardBorder,
        style.cardShadow
      )}
    >
      <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', style.iconBg)}>
        <span className="text-2xl">{category.emoji}</span>
      </div>
      <div className="mt-4">
        <p className="font-display text-base font-bold text-brand-navy">{category.title}</p>
        <p className="mt-0.5 text-[11px] text-brand-navy/60">Mulai {minPriceLabel}</p>
      </div>
      <ArrowRight className="absolute right-3 top-3 h-4 w-4 text-brand-navy/25 transition-opacity group-hover:text-brand-navy/50 group-hover:opacity-100" />
    </Link>
  );
}
