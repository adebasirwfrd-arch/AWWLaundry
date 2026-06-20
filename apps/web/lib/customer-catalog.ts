// Katalog layanan & item pelanggan — direplikasi dari referensi Laundry App
// (Azhar Rivaldi) dengan harga per-item per kategori.

export interface CatalogItem {
  key: string;
  label: string;
  emoji: string;
  price: number;
}

export interface CatalogCategory {
  slug: string;
  title: string;
  emoji: string;
  gradient: string;
  glow: string;
  info: string;
  estimatedHours: number;
  pricePerKg: number;
  items: CatalogItem[];
}

const ITEM_META: { key: string; label: string; emoji: string }[] = [
  { key: 'kaos', label: 'Kaos / Baju', emoji: '👕' },
  { key: 'celana', label: 'Celana', emoji: '👖' },
  { key: 'jaket', label: 'Jaket', emoji: '🧥' },
  { key: 'sprei', label: 'Sprei', emoji: '🛏️' },
  { key: 'karpet', label: 'Karpet', emoji: '🧶' },
];

function buildItems(prices: Record<string, number>): CatalogItem[] {
  return ITEM_META.filter((m) => (prices[m.key] ?? 0) > 0).map((m) => ({
    ...m,
    price: prices[m.key],
  }));
}

export const CATALOG: CatalogCategory[] = [
  {
    slug: 'cuci-basah',
    title: 'Cuci Basah',
    emoji: '🫧',
    gradient: 'from-rainbow-cyan to-brand-sky',
    glow: 'shadow-aww-glow-bubble',
    info: 'Cuci basah merupakan proses pencucian pakaian biasa menggunakan air dan deterjen.',
    estimatedHours: 24,
    pricePerKg: 8000,
    items: buildItems({ kaos: 7000, celana: 5000, jaket: 8000, sprei: 55000, karpet: 150000 }),
  },
  {
    slug: 'dry-cleaning',
    title: 'Dry Cleaning',
    emoji: '✨',
    gradient: 'from-rainbow-purple to-rainbow-blue',
    glow: 'shadow-aww-glow-rainbow',
    info: 'Cuci kering adalah proses pencucian pakaian menggunakan bahan kimia dan teknik tertentu tanpa air.',
    estimatedHours: 72,
    pricePerKg: 25000,
    items: buildItems({ kaos: 8000, celana: 6000, jaket: 9000, sprei: 65000, karpet: 200000 }),
  },
  {
    slug: 'premium-wash',
    title: 'Premium Wash',
    emoji: '👑',
    gradient: 'from-brand-orange to-rainbow-pink',
    glow: 'shadow-aww-glow-orange',
    info: 'Premium Wash menawarkan treatment eksklusif, menggunakan chemical yang environment friendly dan service sepenuh hati.',
    estimatedHours: 48,
    pricePerKg: 15000,
    items: buildItems({ kaos: 9000, celana: 8000, jaket: 10000, sprei: 70000, karpet: 250000 }),
  },
  {
    slug: 'setrika',
    title: 'Setrika',
    emoji: '🔥',
    gradient: 'from-rainbow-yellow to-brand-orange',
    glow: 'shadow-aww-glow-orange',
    info: 'Hilangkan kerutan dari pakaian Anda dengan setrika listrik & uap, rapi dan wangi.',
    estimatedHours: 12,
    pricePerKg: 6000,
    items: buildItems({ kaos: 3000, celana: 4000, jaket: 6000, sprei: 0, karpet: 0 }),
  },
];

export function getCategory(slug: string): CatalogCategory | undefined {
  return CATALOG.find((c) => c.slug === slug);
}
