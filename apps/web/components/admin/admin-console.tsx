'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import {
  Settings2,
  Layers,
  Building2,
  Gift,
  Store,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  updateCatalogCategory,
  createCatalogCategory,
  deleteCatalogCategory,
  updateLoyaltySettings,
  updateOrgProfile,
  updateServiceType,
} from '@/app/actions/admin-console';
import { BranchManager } from '@/components/admin/branch-manager';
import { BranchPaymentSettingsPanel } from '@/components/admin/branch-payment-settings-panel';
import type { CatalogCategory, CatalogItem } from '@/lib/org-settings';
import type { BranchPaymentSettingsInput } from '@/lib/branch-payment-settings';

const ITEM_KEYS = [
  { key: 'kaos', label: 'Kaos / Baju', emoji: '👕' },
  { key: 'celana', label: 'Celana', emoji: '👖' },
  { key: 'jaket', label: 'Jaket', emoji: '🧥' },
  { key: 'sprei', label: 'Sprei', emoji: '🛏️' },
  { key: 'karpet', label: 'Karpet', emoji: '🧶' },
];

type Section = 'catalog' | 'branches' | 'payment' | 'loyalty' | 'org' | 'pos';

interface AdminData {
  settings: {
    tagline: string;
    loyalty: { pointsPerKg: number; appOrderBonus: number; redeemCost: number };
    catalog: CatalogCategory[];
  };
  branches: Array<{
    id: string;
    code: string;
    name: string;
    address: string | null;
    phone: string | null;
    isActive: boolean;
    paymentSettings: BranchPaymentSettingsInput;
    pricing: Array<{
      id: string;
      serviceTypeId: string;
      serviceName: string;
      defaultPricePerKg: number;
      pricePerKg: number;
    }>;
  }>;
  serviceTypes: Array<{
    id: string;
    name: string;
    pricePerKg: number;
    estimatedHours: number;
    isActive: boolean;
  }>;
}

function rupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

export function AdminConsole({ data, orgName }: { data: AdminData; orgName: string }) {
  const [section, setSection] = useState<Section>('catalog');
  const [activeSlug, setActiveSlug] = useState(data.settings.catalog[0]?.slug ?? '');
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const activeCategory = useMemo(
    () => data.settings.catalog.find((c) => c.slug === activeSlug),
    [data.settings.catalog, activeSlug]
  );

  const [catForm, setCatForm] = useState<CatalogCategory | null>(activeCategory ?? null);

  useEffect(() => {
    if (activeCategory) setCatForm({ ...activeCategory, items: [...activeCategory.items] });
  }, [activeSlug, activeCategory]);
  const [loyaltyForm, setLoyaltyForm] = useState(data.settings.loyalty);
  const [orgForm, setOrgForm] = useState({ name: orgName, tagline: data.settings.tagline });

  function selectCategory(slug: string) {
    setActiveSlug(slug);
    const cat = data.settings.catalog.find((c) => c.slug === slug);
    if (cat) setCatForm({ ...cat, items: [...cat.items] });
  }

  function updateItemPrice(key: string, price: number) {
    if (!catForm) return;
    const items = [...catForm.items];
    const idx = items.findIndex((i) => i.key === key);
    const meta = ITEM_KEYS.find((m) => m.key === key)!;
    if (idx >= 0) {
      if (price <= 0) items.splice(idx, 1);
      else items[idx] = { ...items[idx], price };
    } else if (price > 0) {
      items.push({ key, label: meta.label, emoji: meta.emoji, price });
    }
    setCatForm({ ...catForm, items });
  }

  function getItemPrice(key: string) {
    return catForm?.items.find((i) => i.key === key)?.price ?? 0;
  }

  function run(action: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Gagal menyimpan');
      }
    });
  }

  const sections: { id: Section; label: string; icon: typeof Settings2 }[] = [
    { id: 'catalog', label: 'Katalog Layanan', icon: Layers },
    { id: 'branches', label: 'Cabang & Harga/kg', icon: Building2 },
    { id: 'payment', label: 'Rekening & QRIS', icon: CreditCard },
    { id: 'pos', label: 'Layanan POS Kasir', icon: Store },
    { id: 'loyalty', label: 'Program Loyalty', icon: Gift },
    { id: 'org', label: 'Organisasi', icon: Settings2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-brand-navy">Admin Console</h1>
        <p className="mt-1 text-brand-navy/60">
          Kelola harga, layanan, cabang, dan pengaturan yang dipakai kasir, pekerja & pelanggan.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-rainbow-cyan/30 bg-brand-sky/10 px-4 py-3 text-sm text-brand-navy">
          {message}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                section === s.id
                  ? 'bg-aww-rainbow text-white shadow-aww-glow-rainbow'
                  : 'border border-brand-navy/10 bg-white text-brand-navy/70 hover:bg-brand-sky/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Katalog Layanan */}
      {section === 'catalog' && (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="space-y-2 rounded-2xl border border-brand-navy/10 bg-white p-3 shadow-aww-sm">
            <p className="px-2 text-xs font-semibold uppercase tracking-wider text-brand-navy/40">Kategori</p>
            {data.settings.catalog.map((cat) => (
              <button
                key={cat.slug}
                type="button"
                onClick={() => selectCategory(cat.slug)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  activeSlug === cat.slug ? 'bg-brand-sky/15 text-brand-navy' : 'text-brand-navy/65 hover:bg-brand-navy/5'
                }`}
              >
                <span>{cat.emoji}</span>
                <span className="flex-1 truncate">{cat.title}</span>
                <ChevronRight className="h-4 w-4 opacity-40" />
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                const slug = `layanan-${Date.now()}`;
                const newCat: CatalogCategory = {
                  slug,
                  title: 'Layanan Baru',
                  emoji: '🧺',
                  gradient: 'from-rainbow-cyan to-brand-sky',
                  glow: 'shadow-aww-glow-bubble',
                  info: 'Deskripsi layanan',
                  estimatedHours: 24,
                  pricePerKg: 8000,
                  items: [],
                };
                run(() => createCatalogCategory(newCat), 'Kategori baru dibuat');
              }}
              disabled={pending}
            >
              <Plus className="h-4 w-4" /> Tambah Kategori
            </Button>
          </div>

          {catForm && (
            <div className="space-y-5 rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
              <h2 className="font-display text-lg font-bold text-brand-navy">
                {catForm.emoji} {catForm.title}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Nama Layanan" value={catForm.title} onChange={(e) => setCatForm({ ...catForm, title: e.target.value })} />
                <Input label="Emoji" value={catForm.emoji} onChange={(e) => setCatForm({ ...catForm, emoji: e.target.value })} />
                <Input
                  label="Harga per Kg (Rp)"
                  type="number"
                  value={catForm.pricePerKg}
                  onChange={(e) => setCatForm({ ...catForm, pricePerKg: Number(e.target.value) })}
                />
                <Input
                  label="Estimasi Selesai (jam)"
                  type="number"
                  value={catForm.estimatedHours}
                  onChange={(e) => setCatForm({ ...catForm, estimatedHours: Number(e.target.value) })}
                />
              </div>
              <Input
                label="Deskripsi"
                value={catForm.info}
                onChange={(e) => setCatForm({ ...catForm, info: e.target.value })}
              />

              <div>
                <p className="mb-3 text-sm font-semibold text-brand-navy">Harga Satuan (per pcs)</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ITEM_KEYS.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 rounded-xl border border-brand-navy/10 bg-brand-sky/5 p-3">
                      <span className="text-xl">{item.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-brand-navy">{item.label}</p>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          value={getItemPrice(item.key) || ''}
                          placeholder="0 = tidak tersedia"
                          onChange={(e) => updateItemPrice(item.key, Number(e.target.value))}
                          className="mt-1 w-full rounded-lg border border-brand-navy/15 px-3 py-1.5 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-brand-navy/10 pt-4">
                <Button
                  variant="rainbow"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => updateCatalogCategory(catForm.slug, catForm),
                      'Katalog disimpan — harga pelanggan & kasir diperbarui'
                    )
                  }
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Kategori
                </Button>
                {data.settings.catalog.length > 1 && (
                  <Button
                    variant="danger"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Hapus kategori "${catForm.title}"?`)) return;
                      run(() => deleteCatalogCategory(catForm.slug), 'Kategori dihapus');
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cabang */}
      {section === 'branches' && (
        <BranchManager
          branches={data.branches.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            isActive: b.isActive,
          }))}
          serviceTypes={data.serviceTypes}
        />
      )}

      {section === 'payment' && (
        <BranchPaymentSettingsPanel
          branches={data.branches.map((b) => ({
            id: b.id,
            code: b.code,
            name: b.name,
            paymentSettings: b.paymentSettings,
          }))}
          onMessage={setMessage}
        />
      )}

      {/* POS Service Types */}
      {section === 'pos' && (
        <div className="space-y-4">
          <p className="text-sm text-brand-navy/60">
            Layanan yang muncul di POS Kasir. Disinkronkan otomatis dari Katalog Layanan.
          </p>
          {data.serviceTypes.map((svc) => (
            <PosServiceEditor
              key={svc.id}
              service={svc}
              pending={pending}
              onSave={(input) => run(() => updateServiceType(input), 'Layanan POS disimpan')}
            />
          ))}
        </div>
      )}

      {/* Loyalty */}
      {section === 'loyalty' && (
        <div className="max-w-lg space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
          <Input
            label="Poin per Kg cucian"
            type="number"
            value={loyaltyForm.pointsPerKg}
            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, pointsPerKg: Number(e.target.value) })}
          />
          <Input
            label="Bonus pesan via aplikasi (poin)"
            type="number"
            value={loyaltyForm.appOrderBonus}
            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, appOrderBonus: Number(e.target.value) })}
          />
          <Input
            label="Poin untuk redeem 1 kg gratis"
            type="number"
            value={loyaltyForm.redeemCost}
            onChange={(e) => setLoyaltyForm({ ...loyaltyForm, redeemCost: Number(e.target.value) })}
          />
          <Button
            variant="rainbow"
            disabled={pending}
            onClick={() => run(() => updateLoyaltySettings(loyaltyForm), 'Program loyalty disimpan')}
          >
            <Save className="h-4 w-4" /> Simpan Loyalty
          </Button>
        </div>
      )}

      {/* Organisasi */}
      {section === 'org' && (
        <div className="max-w-lg space-y-4 rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
          <Input label="Nama Organisasi" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
          <Input label="Tagline" value={orgForm.tagline} onChange={(e) => setOrgForm({ ...orgForm, tagline: e.target.value })} />
          <Button
            variant="rainbow"
            disabled={pending}
            onClick={() => run(() => updateOrgProfile(orgForm), 'Profil organisasi disimpan')}
          >
            <Save className="h-4 w-4" /> Simpan Organisasi
          </Button>
        </div>
      )}
    </div>
  );
}

function PosServiceEditor({
  service,
  pending,
  onSave,
}: {
  service: AdminData['serviceTypes'][0];
  pending: boolean;
  onSave: (input: {
    id: string;
    name: string;
    pricePerKg: number;
    estimatedHours: number;
    isActive: boolean;
  }) => void;
}) {
  const [form, setForm] = useState(service);
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
      <div className="min-w-[140px] flex-1">
        <Input label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="w-36">
        <Input
          label="Rp/kg"
          type="number"
          value={form.pricePerKg}
          onChange={(e) => setForm({ ...form, pricePerKg: Number(e.target.value) })}
        />
      </div>
      <div className="w-28">
        <Input
          label="Jam"
          type="number"
          value={form.estimatedHours}
          onChange={(e) => setForm({ ...form, estimatedHours: Number(e.target.value) })}
        />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
        Aktif
      </label>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => onSave(form)}>
        Simpan
      </Button>
    </div>
  );
}
