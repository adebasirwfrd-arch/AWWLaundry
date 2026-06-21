'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, ShoppingBag, PartyPopper, Receipt, Scale, ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CelebrationBurst } from '@/components/animations/celebration-burst';
import { ReceiptBill } from '@/components/pos/receipt-bill';
import { CategoryHero } from '@/components/customer/category-hero';
import type { ReceiptData } from '@/components/pos/thermal-receipt';
import { createCustomerOrder } from '@/app/actions/customer-orders';
import type { CatalogCategory } from '@/lib/customer-catalog';
import {
  CustomerPaymentStep,
  type CustomerPaymentStepResult,
} from '@/components/customer/customer-payment-step';
import {
  LOYALTY_REDEEM_COST,
  LOYALTY_POINTS_PER_KG,
  LOYALTY_APP_ORDER_BONUS,
  canRedeemFreeKg,
  redemptionDiscount,
  kgNeededForRedemption,
  TRANSFER_BANK_DETAILS,
  type TransferBankDetails,
} from '@aww/shared';
import { Sparkles } from 'lucide-react';

type OrderMode = 'satuan' | 'kiloan';
type BuilderStep = 'order' | 'payment';

const BRANCH_STORAGE_KEY = 'aww-customer-branch-id';

function rupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

export function OrderBuilder({
  category,
  branches,
  loyaltyPoints = 0,
  loyaltyConfig,
}: {
  category: CatalogCategory;
  branches: Array<{
    id: string;
    name: string;
    address?: string | null;
    pricePerKg: number;
    bankDetails?: TransferBankDetails;
  }>;
  loyaltyPoints?: number;
  loyaltyConfig?: { pointsPerKg: number; appOrderBonus: number; redeemCost: number };
}) {
  const router = useRouter();
  const pointsPerKg = loyaltyConfig?.pointsPerKg ?? LOYALTY_POINTS_PER_KG;
  const redeemCost = loyaltyConfig?.redeemCost ?? LOYALTY_REDEEM_COST;
  const appBonus = loyaltyConfig?.appOrderBonus ?? LOYALTY_APP_ORDER_BONUS;
  const [orderMode, setOrderMode] = useState<OrderMode>('satuan');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');

  useEffect(() => {
    const saved = localStorage.getItem(BRANCH_STORAGE_KEY);
    if (saved && branches.some((b) => b.id === saved)) {
      setBranchId(saved);
    }
  }, [branches]);

  function selectBranch(nextBranchId: string) {
    setBranchId(nextBranchId);
    localStorage.setItem(BRANCH_STORAGE_KEY, nextBranchId);
  }
  const [weightKg, setWeightKg] = useState('');
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>(
    Object.fromEntries(category.items.map((i) => [i.key, 0]))
  );
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<BuilderStep>('order');
  const [celebrate, setCelebrate] = useState(false);
  const [done, setDone] = useState<ReceiptData | null>(null);
  const [showBill, setShowBill] = useState(false);

  const weight = parseFloat(weightKg) || 0;
  const selectedBranch = branches.find((b) => b.id === branchId) ?? branches[0];
  const branchPricePerKg = selectedBranch?.pricePerKg ?? category.pricePerKg;
  const redeemEligible = loyaltyPoints >= redeemCost;
  const redeemDiscount = redemptionDiscount(branchPricePerKg);

  const { totalItems, totalPrice, summaryLabel, discountApplied } = useMemo(() => {
    if (orderMode === 'kiloan') {
      const gross = Math.round(weight * branchPricePerKg);
      const discount = redeemPoints && redeemEligible ? redeemDiscount : 0;
      const price = Math.max(0, gross - discount);
      return {
        totalItems: weight > 0 ? 1 : 0,
        totalPrice: price,
        discountApplied: discount,
        summaryLabel: weight > 0 ? `${weight} kg` : '0 kg',
      };
    }
    let items = 0;
    let price = 0;
    for (const it of category.items) {
      const q = qty[it.key] ?? 0;
      items += q;
      price += q * it.price;
    }
    return { totalItems: items, totalPrice: price, discountApplied: 0, summaryLabel: `${items} item` };
  }, [orderMode, weight, branchPricePerKg, qty, category.items, redeemPoints, redeemEligible, redeemDiscount]);

  function setItem(key: string, delta: number) {
    setQty((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + delta) }));
  }

  const canCheckout = (orderMode === 'kiloan' ? weight > 0 : totalItems > 0) && !!branchId;

  async function checkout(payment: CustomerPaymentStepResult) {
    if (!canCheckout) return;
    setLoading(true);
    try {
      const base = { category: category.slug, branchId, orderMode, payment } as const;
      const res = await createCustomerOrder(
        orderMode === 'kiloan'
          ? { ...base, orderMode: 'kiloan', weightKg: weight, redeemPoints: redeemPoints && redeemEligible }
          : {
              ...base,
              orderMode: 'satuan',
              items: category.items.map((i) => ({
                key: i.key,
                label: i.label,
                qty: qty[i.key] ?? 0,
                unitPrice: i.price,
              })),
            }
      );
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setDone({
        orderNumber: res.orderNumber,
        total: res.total,
        weightKg: res.weightKg ?? 0,
        customerName: res.customerName,
        customerPhone: res.customerPhone,
        serviceName: res.serviceName,
        estimatedReadyAt: res.estimatedReadyAt,
        paid: res.paymentStatus === 'PAID',
        paymentStatus: res.paymentStatus as 'PAID' | 'PARTIAL' | 'UNPAID',
        paymentMode: res.paymentMode,
        paymentMethod: res.paymentMethod,
        payments: res.payments,
        remainingAmount: res.remainingAmount,
        remainingMethod: res.remainingMethod,
        orderStatus: 'ON_HOLD',
        branchName: res.branchName,
        branchPhone: res.branchPhone,
        trackUrl: `${origin}/track?order=${res.orderNumber}`,
        items: res.items,
      });
      setCelebrate(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal memesan');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    if (showBill) {
      return (
        <div className="py-2">
          <ReceiptBill data={done} onClose={() => setShowBill(false)} variant="download" />
        </div>
      );
    }
    return (
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center text-center">
        <CelebrationBurst show={celebrate} onDone={() => setCelebrate(false)} />
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-aww-payment shadow-aww-glow-rainbow">
          <PartyPopper className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-brand-navy">Pesanan Terkirim! 🎉</h1>
        <p className="mt-2 max-w-xs text-brand-navy/60">
          Pesanan <span className="font-mono font-semibold">{done.orderNumber}</span> menunggu konfirmasi kasir di{' '}
          <strong className="text-brand-navy">{done.branchName}</strong>.
          {done.paymentMode === 'CASH'
            ? ' Bayar tunai saat sampai di cabang.'
            : done.paymentMode === 'PAY_LATER'
              ? ' Bayar setelah cucian selesai — kasir konfirmasi saat cucian diterima.'
              : done.paymentStatus === 'PARTIAL'
              ? ' DP sudah tercatat — sisanya bayar setelah cucian selesai.'
              : done.paymentMode !== 'CASH'
                ? ' Bukti pembayaran sudah terkirim ke kasir.'
                : ''}
        </p>
        <p className="mt-3 max-w-xs rounded-xl bg-brand-sky/10 px-3 py-2 text-xs text-brand-navy/65">
          <Sparkles className="mb-1 inline h-3.5 w-3.5 text-rainbow-yellow" /> Bonus{' '}
          <strong className="text-brand-navy">+{appBonus} poin</strong> akan ditambahkan setelah kasir konfirmasi pesanan & pembayaran.
        </p>
        <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
          <Button variant="rainbow" className="w-full" onClick={() => setShowBill(true)}>
            <Receipt className="h-4 w-4" /> Lihat Struk & Barcode
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => router.push('/customer/history')}>
            Lihat Riwayat
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/customer')}>
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <CustomerPaymentStep
        totalPrice={totalPrice}
        branchId={branchId}
        branchName={selectedBranch?.name ?? 'Cabang'}
        bankDetails={selectedBranch?.bankDetails ?? TRANSFER_BANK_DETAILS}
        summaryLabel={summaryLabel}
        loading={loading}
        onBack={() => setStep('order')}
        onSubmit={(payment) => void checkout(payment)}
      />
    );
  }

  return (
    <div className="space-y-5 pb-24">
      <Link href="/customer" className="inline-flex items-center gap-2 text-sm font-medium text-brand-navy/60 hover:text-brand-navy">
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <CategoryHero category={category} />

      <div className="flex items-start gap-3 rounded-2xl border border-rainbow-cyan/25 bg-brand-sky/10 p-4">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-rainbow-yellow" />
        <div className="text-sm text-brand-navy/75">
          <p className="font-semibold text-brand-navy">Bonus pesan via aplikasi: +{appBonus} poin</p>
          <p className="mt-0.5 text-xs text-brand-navy/55">
            Poin ditambahkan setelah kasir konfirmasi pesanan (Pesan Masuk atau scan barcode). Batal sebelum konfirmasi = poin tidak diberikan.
          </p>
        </div>
      </div>

      {/* Pilih cabang */}
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
        <label htmlFor="branch-select" className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <MapPin className="h-4 w-4 text-rainbow-cyan" />
          Pilih Cabang
        </label>
        <div className="relative">
          <select
            id="branch-select"
            value={branchId}
            onChange={(e) => selectBranch(e.target.value)}
            className="h-12 w-full appearance-none rounded-xl border border-brand-navy/15 bg-white px-4 pr-10 text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/30"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}{b.address ? ` — ${b.address}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-navy/40" />
        </div>
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Pesanan masuk ke <strong>Kotak Masuk kasir {selectedBranch?.name ?? 'cabang ini'}</strong>. Pastikan cabang sesuai lokasi antar/jemput cucian.
        </p>
        {orderMode === 'kiloan' && selectedBranch && (
          <p className="mt-2 text-xs text-brand-navy/50">
            Harga di cabang ini: {rupiah(branchPricePerKg)}/kg
          </p>
        )}
      </div>

      {/* Mode selector */}
      <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
        <label htmlFor="order-mode" className="mb-2 block text-sm font-semibold text-brand-navy">
          Tipe Pesanan
        </label>
        <div className="relative">
          <select
            id="order-mode"
            value={orderMode}
            onChange={(e) => {
              const mode = e.target.value as OrderMode;
              setOrderMode(mode);
              if (mode !== 'kiloan') setRedeemPoints(false);
            }}
            className="h-12 w-full appearance-none rounded-xl border border-brand-navy/15 bg-white px-4 pr-10 text-brand-navy focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/30"
          >
            <option value="satuan">Satuan — per jenis barang (pcs)</option>
            <option value="kiloan">Kiloan — ditimbang per kg</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-navy/40" />
        </div>
      </div>

      {orderMode === 'kiloan' ? (
        <div className="space-y-4">
          <h2 className="font-display text-base font-bold text-brand-navy">Masukkan Berat Cucian</h2>
          <div className="rounded-3xl border border-brand-navy/10 bg-white p-5 shadow-aww-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-aww-rainbow text-white shadow-aww-glow-rainbow">
                <Scale className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-brand-navy">{category.title} — Kiloan</p>
                <p className="text-sm text-brand-orange">{rupiah(branchPricePerKg)}<span className="text-brand-navy/40"> /kg</span></p>
              </div>
            </div>
            <Input
              id="weight"
              label="Berat (kg)"
              type="number"
              step="0.5"
              min="0.5"
              placeholder="Contoh: 3"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
            />
            {weight > 0 && (
              <div className="mt-4 rounded-2xl bg-brand-sky/10 px-4 py-3 text-center">
                <p className="text-xs text-brand-navy/50">Estimasi harga</p>
                {discountApplied > 0 && (
                  <p className="text-xs font-medium text-rainbow-green">
                    Diskon redeem (−{rupiah(discountApplied)}) · gratis 1 kg
                  </p>
                )}
                <p className="font-display text-2xl font-extrabold text-brand-orange">
                  {rupiah(totalPrice)}
                </p>
                <p className="mt-0.5 text-xs text-brand-navy/45">
                  {weight} kg × {rupiah(branchPricePerKg)}/kg
                </p>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-brand-navy/10 bg-brand-sky/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rainbow-yellow" />
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">Poin loyalty: {loyaltyPoints}</p>
                    <p className="mt-0.5 text-xs text-brand-navy/55">
                      +{pointsPerKg} poin/kg · {redeemCost} poin = gratis 1 kg
                      {loyaltyPoints < redeemCost && (
                        <> · butuh {redeemCost - loyaltyPoints} poin lagi</>
                      )}
                    </p>
                  </div>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={redeemPoints}
                    disabled={!redeemEligible}
                    onChange={(e) => setRedeemPoints(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-navy/20 text-rainbow-cyan focus:ring-rainbow-cyan"
                  />
                  <span className={`text-xs font-semibold ${redeemEligible ? 'text-brand-navy' : 'text-brand-navy/35'}`}>
                    Redeem
                  </span>
                </label>
              </div>
              {!redeemEligible && (
                <p className="mt-2 text-[11px] text-brand-navy/45">
                  Kumpulkan ~{kgNeededForRedemption()} kg cucian untuk redeem 1 kg gratis.
                </p>
              )}
            </div>
            <p className="mt-3 text-xs text-brand-navy/45">
              Berat final ditimbang ulang saat penjemputan / saat sampai di cabang.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-display text-base font-bold text-brand-navy">Pilih Barang</h2>
          {category.items.map((item) => {
            const q = qty[item.key] ?? 0;
            return (
              <div
                key={item.key}
                className={`flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-aww-sm transition-colors ${q > 0 ? 'border-rainbow-cyan' : 'border-brand-navy/10'}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-sky/10 text-2xl">{item.emoji}</span>
                <div className="flex-1">
                  <p className="font-semibold text-brand-navy">{item.label}</p>
                  <p className="text-sm text-brand-orange">{rupiah(item.price)}<span className="text-xs text-brand-navy/40"> /pcs</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setItem(item.key, -1)}
                    disabled={q === 0}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-navy/15 text-brand-navy transition-colors hover:bg-brand-navy/5 disabled:opacity-30"
                    aria-label="Kurangi"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-brand-navy">{q}</span>
                  <button
                    onClick={() => setItem(item.key, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-aww-rainbow text-white shadow-aww-glow-rainbow transition-transform hover:scale-110"
                    aria-label="Tambah"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky checkout bar */}
      <div className="fixed inset-x-0 bottom-[68px] z-30 px-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl bg-brand-navy p-3 text-white shadow-aww-lg">
          <div>
            <p className="text-xs text-white/60">{summaryLabel}</p>
            {discountApplied > 0 && (
              <p className="text-[10px] text-rainbow-green">−{rupiah(discountApplied)} poin</p>
            )}
            <p className="font-display text-lg font-bold">{rupiah(totalPrice)}</p>
          </div>
          <Button
            variant="rainbow"
            onClick={() => setStep('payment')}
            disabled={!canCheckout || loading}
            className="px-6"
          >
            <ShoppingBag className="h-4 w-4" />
            Lanjut Pembayaran
          </Button>
        </div>
      </div>
    </div>
  );
}
