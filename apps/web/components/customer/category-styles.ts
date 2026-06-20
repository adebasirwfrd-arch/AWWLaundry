/** Warna aksen per kategori — class Tailwind lengkap agar ter-generate saat build. */
export const CATEGORY_STYLES: Record<
  string,
  { iconBg: string; cardBorder: string; cardShadow: string }
> = {
  'cuci-basah': {
    iconBg: 'bg-rainbow-cyan/15',
    cardBorder: 'border-rainbow-cyan/25',
    cardShadow: 'shadow-aww-glow-bubble',
  },
  'dry-cleaning': {
    iconBg: 'bg-rainbow-purple/15',
    cardBorder: 'border-rainbow-purple/25',
    cardShadow: 'shadow-aww-glow-rainbow',
  },
  'premium-wash': {
    iconBg: 'bg-brand-orange/15',
    cardBorder: 'border-brand-orange/25',
    cardShadow: 'shadow-aww-glow-orange',
  },
  setrika: {
    iconBg: 'bg-rainbow-yellow/20',
    cardBorder: 'border-rainbow-yellow/40',
    cardShadow: 'shadow-aww-glow-orange',
  },
};

export function getCategoryStyle(slug: string) {
  return (
    CATEGORY_STYLES[slug] ?? {
      iconBg: 'bg-brand-sky/15',
      cardBorder: 'border-brand-navy/10',
      cardShadow: 'shadow-aww-sm',
    }
  );
}
