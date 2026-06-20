import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CatalogCategory } from '@/lib/customer-catalog';
import { getCategoryStyle } from '@/components/customer/category-styles';

export function CategoryHero({ category }: { category: CatalogCategory }) {
  const style = getCategoryStyle(category.slug);

  return (
    <div className={cn('rounded-3xl border bg-white p-5 shadow-aww-sm', style.cardBorder)}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl', style.iconBg)}>
          <span className="text-3xl">{category.emoji}</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold text-brand-navy">{category.title}</h1>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-brand-navy/65">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy/40" />
        {category.info}
      </p>
    </div>
  );
}
