import Link from 'next/link';
import { prisma } from '@aww/database';
import { MapPin, Star, Navigation, Receipt, ArrowRight } from 'lucide-react';
import { requireAuth } from '@/lib/session';
import { Role } from '@aww/database';
import { getCatalogForOrg } from '@/lib/org-settings';
import { Reveal } from '@/components/animations/reveal';
import { WashingMachine } from '@/components/brand/washing-machine';
import { ServiceCategoryCard } from '@/components/customer/service-category-card';

export default async function CustomerHomePage() {
  const session = await requireAuth([Role.CUSTOMER]);
  const [branches, catalog] = await Promise.all([
    prisma.branch.findMany({
      where: { organizationId: session.user.organizationId, isActive: true },
      select: { id: true, name: true, address: true, phone: true },
      take: 6,
    }),
    getCatalogForOrg(session.user.organizationId),
  ]);

  const ratings = [4.9, 4.8, 5.0, 4.7, 4.9, 4.8];

  return (
    <div className="space-y-7">
      {/* Promo hero */}
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-aww-header p-5 text-white shadow-aww-lg">
          <div className="relative z-10 max-w-[70%]">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Selamat datang di</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold">Mau cuci apa hari ini?</h1>
            <p className="mt-2 text-sm text-white/80">Pilih layanan, atur jumlah, langsung pesan. Bersih & wangi tanpa ribet.</p>
          </div>
          <div className="absolute -bottom-3 -right-2 opacity-90">
            <WashingMachine className="h-28 w-28" />
          </div>
        </div>
      </Reveal>

      {/* Service categories */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-brand-navy">Layanan Kami</h2>
        <div className="grid grid-cols-2 gap-3">
          {catalog.map((cat, i) => (
            <Reveal key={cat.slug} delay={i * 0.06}>
              <ServiceCategoryCard
                category={cat}
                minPriceLabel={formatRupiah(
                  cat.items.length > 0
                    ? Math.min(...cat.items.map((it) => it.price))
                    : cat.pricePerKg
                )}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* History shortcut */}
      <Reveal>
        <Link
          href="/customer/history"
          className="flex items-center gap-4 rounded-3xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm transition-all hover:-translate-y-0.5 hover:shadow-aww-md"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
            <Receipt className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-brand-navy">Riwayat Pesanan</p>
            <p className="text-sm text-brand-navy/55">Lihat & lacak semua pesananmu</p>
          </div>
          <ArrowRight className="h-5 w-5 text-brand-navy/30" />
        </Link>
      </Reveal>

      {/* Nearby / Recommendations */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-brand-navy">Laundry Terdekat</h2>
        <div className="space-y-3">
          {branches.map((b, i) => (
            <Reveal key={b.id} delay={i * 0.05}>
              <div className="flex items-center gap-4 rounded-3xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rainbow-cyan/15 text-2xl">
                  🧺
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand-navy">{b.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-brand-navy/55">
                    <MapPin className="h-3 w-3 shrink-0" /> {b.address ?? 'Alamat tidak tersedia'}
                  </p>
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-rainbow-yellow text-rainbow-yellow" />
                    <span className="text-xs font-semibold text-brand-navy">{ratings[i] ?? 4.8}</span>
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.address ?? b.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded-xl bg-aww-cta px-3 py-2 text-xs font-semibold text-white shadow-aww-glow-orange transition-transform hover:scale-105"
                >
                  <Navigation className="h-3.5 w-3.5" /> Rute
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatRupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}
