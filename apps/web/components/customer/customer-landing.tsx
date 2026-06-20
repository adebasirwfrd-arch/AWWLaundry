'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import {
  Truck,
  Sparkles,
  Bell,
  ShieldCheck,
  Clock,
  Leaf,
  Star,
  ChevronDown,
  ArrowRight,
  WashingMachine as WMIcon,
  CheckCircle2,
} from 'lucide-react';
import { RainbowBubbleField } from '@/components/animations/rainbow-bubble-field';
import { ScrollReveal } from '@/components/animations/scroll-reveal';
import { AnimatedLogo } from '@/components/brand/animated-logo';
import { WaterDropletMascot } from '@/components/brand/water-droplet-mascot';
import { WashingMachine } from '@/components/brand/washing-machine';
import { AnimatedCounter } from '@/components/animations/animated-counter';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@aww/shared';

interface Service {
  id: string;
  name: string;
  pricePerKg: number;
  estimatedHours: number;
}

const HOW_IT_WORKS = [
  { icon: Truck, title: 'Pesan Jemput', desc: 'Pilih jadwal, kurir kami datang ambil cucian ke rumah Anda', color: '#4ECDC4' },
  { icon: WMIcon, title: 'Kami Cuci', desc: 'Dicuci, dikeringkan, disetrika dengan standar premium', color: '#4A90D9' },
  { icon: Bell, title: 'Pantau Real-time', desc: 'Lacak setiap tahap & dapat notifikasi saat siap', color: '#9B59B6' },
  { icon: CheckCircle2, title: 'Antar Balik', desc: 'Cucian wangi & rapi diantar kembali ke depan pintu', color: '#6BCB77' },
];

const FEATURES = [
  { icon: Clock, title: 'Express 6 Jam', desc: 'Butuh cepat? Layanan kilat siap dalam 6 jam.' },
  { icon: ShieldCheck, title: 'Garansi Bersih', desc: 'Tidak puas? Cuci ulang gratis, tanpa ribet.' },
  { icon: Leaf, title: 'Ramah Lingkungan', desc: 'Deterjen eco-friendly, aman untuk kulit & bumi.' },
  { icon: Bell, title: 'Notifikasi Live', desc: 'Update WhatsApp di tiap tahap pencucian.' },
];

const TESTIMONIALS = [
  { name: 'Sarah W.', text: 'Jemput tepat waktu, cucian wangi banget, dan bisa dilacak real-time. Kayak pakai aplikasi luar negeri!', rating: 5 },
  { name: 'Budi P.', text: 'Express 6 jam beneran nyelamatin pas darurat. Strukmya rapi, ada QR buat tracking. Mantap.', rating: 5 },
  { name: 'Citra L.', text: 'Animasinya lucu, gampang dipakai. Notif WhatsApp pas siap bikin nggak perlu nungguin.', rating: 5 },
];

const FAQS = [
  { q: 'Berapa lama proses cuci?', a: 'Cuci kering 24 jam, cuci setrika 48 jam, dan express 6 jam. Anda bisa pantau estimasi waktunya secara real-time di halaman lacak.' },
  { q: 'Area mana saja yang dijemput?', a: 'Saat ini kami melayani area Jakarta Selatan dan sekitarnya. Cukup masukkan alamat saat pesan jemput.' },
  { q: 'Bagaimana cara bayar?', a: 'Tersedia tunai, QRIS, transfer bank, GoPay, ShopeePay, OVO, dan DANA. Bayar saat jemput atau saat antar balik.' },
  { q: 'Apakah ada garansi?', a: 'Ya! Jika hasil cucian kurang memuaskan, kami cuci ulang gratis. Kepuasan Anda prioritas kami.' },
];

export function CustomerLanding({ services }: { services: Service[] }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });
      tl.from('.hero-badge', { y: 20, opacity: 0, duration: 0.5 })
        .from('.hero-title span', { y: 40, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'back.out(1.4)' }, '-=0.2')
        .from('.hero-sub', { y: 20, opacity: 0, duration: 0.5 }, '-=0.3')
        .from('.hero-cta', { y: 20, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.2')
        .from('.hero-trust', { opacity: 0, duration: 0.6 }, '-=0.1');
    }, el);
    return () => ctx.revert();
  }, []);

  const displayServices = services.length
    ? services
    : [
        { id: '1', name: 'Cuci Kering', pricePerKg: 8000, estimatedHours: 24 },
        { id: '2', name: 'Cuci Setrika', pricePerKg: 12000, estimatedHours: 48 },
        { id: '3', name: 'Cuci Express', pricePerKg: 15000, estimatedHours: 6 },
        { id: '4', name: 'Dry Clean', pricePerKg: 25000, estimatedHours: 72 },
      ];

  return (
    <div className="relative overflow-hidden bg-aww-brand-hero">
      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden pt-24">
        <RainbowBubbleField density="high" />
        <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-rainbow-pink/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 top-40 h-96 w-96 rounded-full bg-rainbow-cyan/20 blur-3xl" />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="hero-badge inline-flex items-center gap-2 rounded-full border border-brand-pink/20 bg-white/70 px-4 py-1.5 text-sm font-semibold text-brand-pink backdrop-blur-sm">
              <Sparkles className="h-4 w-4" /> #1 Laundry Antar-Jemput
            </span>
            <h1 className="hero-title mt-5 font-display text-5xl font-extrabold leading-[1.1] text-brand-navy sm:text-6xl">
              <span className="block">Laundry</span>
              <span className="block bg-aww-rainbow bg-clip-text text-transparent">Tanpa Repot.</span>
              <span className="block">Dijemput ke Rumah.</span>
            </h1>
            <p className="hero-sub mt-6 max-w-md text-lg text-brand-navy/70">
              Pesan, kami jemput, cuci bersih wangi, lalu antar balik. Pantau setiap tahap
              secara real-time — semudah pesan transportasi online.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/book" className="hero-cta">
                <Button variant="rainbow" size="lg" className="group">
                  Pesan Jemput Sekarang
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/track" className="hero-cta">
                <Button variant="outline" size="lg">Lacak Cucian</Button>
              </Link>
            </div>

            <div className="hero-trust mt-10 flex flex-wrap items-center gap-8">
              <div>
                <p className="font-display text-2xl font-bold text-brand-navy">
                  <AnimatedCounter value={12500} suffix="+" />
                </p>
                <p className="text-sm text-brand-navy/55">Cucian selesai</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-brand-navy">
                  <AnimatedCounter value={4} suffix=".9★" />
                </p>
                <p className="text-sm text-brand-navy/55">Rating pelanggan</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-brand-navy">6 jam</p>
                <p className="text-sm text-brand-navy/55">Express tercepat</p>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-aww-rainbow opacity-20 blur-3xl" />
              <div className="relative rounded-[2.5rem] border border-white/60 bg-white/60 p-8 shadow-aww-lg backdrop-blur-xl">
                <AnimatedLogo width={300} height={160} priority />
                <div className="mt-6 flex items-center justify-around">
                  <WashingMachine className="h-20 w-20" />
                  <WaterDropletMascot className="h-24 w-24" wave />
                </div>
                <p className="mt-4 text-center text-sm font-bold tracking-[0.3em] text-brand-pink">
                  FRESH • CLEAN • FUN
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="relative mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <ScrollReveal className="mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-pink">Semudah 1-2-3-4</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold text-brand-navy">Cara Kerjanya</h2>
        </ScrollReveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <ScrollReveal key={step.title} delay={i * 0.1}>
                <div className="group relative h-full rounded-3xl border border-white/60 bg-white/70 p-6 text-center shadow-aww-sm backdrop-blur-md transition-all hover:-translate-y-2 hover:shadow-aww-lg">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-navy px-3 py-0.5 text-xs font-bold text-white">
                    {i + 1}
                  </div>
                  <div
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-aww-glow-bubble transition-transform group-hover:scale-110"
                    style={{ backgroundColor: step.color }}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-brand-navy">{step.title}</h3>
                  <p className="mt-2 text-sm text-brand-navy/60">{step.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* SERVICES / PRICING */}
      <section id="harga" className="relative bg-white/40 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <ScrollReveal className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-pink">Transparan</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-brand-navy">Layanan & Harga</h2>
            <p className="mt-2 text-brand-navy/60">Tanpa biaya tersembunyi. Bayar sesuai berat cucian.</p>
          </ScrollReveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {displayServices.map((s, i) => {
              const popular = s.name.toLowerCase().includes('setrika');
              return (
                <ScrollReveal key={s.id} delay={i * 0.08}>
                  <div
                    className={`relative h-full rounded-3xl border-2 bg-white p-6 transition-all hover:-translate-y-2 hover:shadow-aww-lg ${
                      popular ? 'border-brand-orange shadow-aww-glow-orange' : 'border-brand-navy/10 shadow-aww-sm'
                    }`}
                  >
                    {popular && (
                      <span className="absolute -top-3 right-4 rounded-full bg-aww-cta px-3 py-0.5 text-xs font-bold text-white">
                        Terpopuler
                      </span>
                    )}
                    <h3 className="font-display text-lg font-bold text-brand-navy">{s.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="font-display text-3xl font-extrabold text-brand-orange">
                        {formatCurrency(s.pricePerKg)}
                      </span>
                      <span className="text-sm text-brand-navy/50">/kg</span>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-navy/55">
                      <Clock className="h-4 w-4" /> Selesai ± {s.estimatedHours} jam
                    </p>
                    <Link href="/book" className="mt-5 block">
                      <Button variant={popular ? 'primary' : 'secondary'} className="w-full">
                        Pilih Layanan
                      </Button>
                    </Link>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="layanan" className="relative mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <ScrollReveal className="mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-pink">Kenapa AWW?</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold text-brand-navy">Lebih dari Sekadar Laundry</h2>
        </ScrollReveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <ScrollReveal key={f.title} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-white/60 bg-white/70 p-6 shadow-aww-sm backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-aww-md">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-aww-rainbow shadow-aww-glow-rainbow">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-brand-navy">{f.title}</h3>
                  <p className="mt-1 text-sm text-brand-navy/60">{f.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimoni" className="relative bg-white/40 py-20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <ScrollReveal className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-pink">Kata Mereka</p>
            <h2 className="mt-2 font-display text-4xl font-extrabold text-brand-navy">Dipercaya Ribuan Pelanggan</h2>
          </ScrollReveal>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 0.1}>
                <div className="h-full rounded-3xl bg-white p-6 shadow-aww-sm">
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-rainbow-yellow text-rainbow-yellow" />
                    ))}
                  </div>
                  <p className="text-brand-navy/75">&ldquo;{t.text}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-aww-rainbow text-sm font-bold text-white">
                      {t.name[0]}
                    </div>
                    <p className="font-semibold text-brand-navy">{t.name}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-3xl px-4 py-20 lg:px-8">
        <ScrollReveal className="mb-12 text-center">
          <h2 className="font-display text-4xl font-extrabold text-brand-navy">Pertanyaan Umum</h2>
        </ScrollReveal>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 0.05}>
              <div className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                >
                  <span className="font-semibold text-brand-navy">{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-brand-navy/40 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${openFaq === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-5 text-sm text-brand-navy/65">{faq.a}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative px-4 pb-24 lg:px-8">
        <ScrollReveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-aww-header p-10 text-center shadow-aww-lg sm:p-16">
            <RainbowBubbleField density="normal" />
            <div className="relative z-10">
              <h2 className="font-display text-4xl font-extrabold text-white">Siap Cucian Bersih Tanpa Ribet?</h2>
              <p className="mx-auto mt-3 max-w-md text-white/80">
                Pesan sekarang, kurir kami siap menjemput cucian Anda hari ini juga.
              </p>
              <Link href="/book" className="mt-8 inline-block">
                <Button variant="rainbow" size="lg" className="group">
                  Pesan Jemput Sekarang
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-brand-navy/10 bg-white/60 py-10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center lg:px-8">
          <AnimatedLogo width={150} height={80} bubbles={false} />
          <p className="text-sm text-brand-navy/55">FRESH • CLEAN • FUN — Platform laundry antar-jemput #1</p>
          <div className="flex gap-6 text-sm text-brand-navy/60">
            <Link href="/track" className="hover:text-brand-navy">Lacak Cucian</Link>
            <Link href="/book" className="hover:text-brand-navy">Pesan Jemput</Link>
            <Link href="/login" className="hover:text-brand-navy">Login Staff</Link>
          </div>
          <p className="text-xs text-brand-navy/40">© 2026 AWW Laundry. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
