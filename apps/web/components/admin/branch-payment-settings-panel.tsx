'use client';

import { useEffect, useState, useTransition } from 'react';
import { Building2, CreditCard, QrCode, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateBranchPaymentSettings } from '@/app/actions/admin-console';
import type { BranchPaymentSettingsInput } from '@/lib/branch-payment-settings';

interface BranchPaymentItem {
  id: string;
  code: string;
  name: string;
  paymentSettings: BranchPaymentSettingsInput;
}

const emptyForm = (): BranchPaymentSettingsInput => ({
  qris: {
    merchantPan: '',
    merchantName: '',
    merchantCity: '',
    nmid: '',
    mcc: '',
  },
  bankTransfer: {
    bankName: '',
    accountName: '',
    accountNumber: '',
  },
});

export function BranchPaymentSettingsPanel({
  branches,
  onMessage,
}: {
  branches: BranchPaymentItem[];
  onMessage: (msg: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState(branches[0]?.id ?? '');
  const [form, setForm] = useState<BranchPaymentSettingsInput>(emptyForm());
  const [pending, startTransition] = useTransition();

  const selected = branches.find((b) => b.id === selectedId);

  useEffect(() => {
    if (!selected) return;
    const ps = selected.paymentSettings;
    setForm({
      qris: {
        merchantPan: ps.qris?.merchantPan ?? '',
        merchantName: ps.qris?.merchantName ?? '',
        merchantCity: ps.qris?.merchantCity ?? '',
        nmid: ps.qris?.nmid ?? '',
        mcc: ps.qris?.mcc ?? '',
      },
      bankTransfer: {
        bankName: ps.bankTransfer?.bankName ?? '',
        accountName: ps.bankTransfer?.accountName ?? '',
        accountNumber: ps.bankTransfer?.accountNumber ?? '',
      },
    });
  }, [selectedId, selected]);

  function updateQris(field: keyof NonNullable<BranchPaymentSettingsInput['qris']>, value: string) {
    setForm((prev) => ({ ...prev, qris: { ...prev.qris, [field]: value } }));
  }

  function updateBank(field: keyof NonNullable<BranchPaymentSettingsInput['bankTransfer']>, value: string) {
    setForm((prev) => ({ ...prev, bankTransfer: { ...prev.bankTransfer, [field]: value } }));
  }

  function save() {
    if (!selectedId) return;
    onMessage(null);
    startTransition(async () => {
      try {
        await updateBranchPaymentSettings(selectedId, form);
        onMessage(`Pengaturan pembayaran ${selected?.name ?? 'cabang'} disimpan`);
      } catch (e) {
        onMessage(e instanceof Error ? e.message : 'Gagal menyimpan');
      }
    });
  }

  if (branches.length === 0) {
    return (
      <p className="rounded-2xl border border-brand-navy/10 bg-white p-6 text-sm text-brand-navy/60">
        Belum ada cabang. Tambahkan cabang terlebih dahulu di tab Cabang & Harga/kg.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2 rounded-2xl border border-brand-navy/10 bg-white p-3 shadow-aww-sm">
        <p className="px-2 text-xs font-semibold uppercase tracking-wider text-brand-navy/40">Cabang</p>
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedId(b.id)}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              selectedId === b.id ? 'bg-brand-sky/15 text-brand-navy' : 'text-brand-navy/65 hover:bg-brand-navy/5'
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0 opacity-60" />
            <span className="flex-1 truncate">{b.name}</span>
            <span className="font-mono text-[10px] text-brand-navy/40">{b.code}</span>
          </button>
        ))}
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-rainbow-blue" />
            <h2 className="font-display text-lg font-bold text-brand-navy">Rekening Transfer Bank</h2>
          </div>
          <p className="mb-4 text-sm text-brand-navy/60">
            Ditampilkan ke pelanggan & kasir saat metode Transfer Bank dipilih. Kosongkan semua field untuk pakai rekening default sistem.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nama Bank"
              value={form.bankTransfer?.bankName ?? ''}
              onChange={(e) => updateBank('bankName', e.target.value)}
              placeholder="Bank Mandiri"
            />
            <Input
              label="Atas Nama"
              value={form.bankTransfer?.accountName ?? ''}
              onChange={(e) => updateBank('accountName', e.target.value)}
              placeholder="Nama pemilik rekening"
            />
            <Input
              label="No. Rekening"
              value={form.bankTransfer?.accountNumber ?? ''}
              onChange={(e) => updateBank('accountNumber', e.target.value)}
              placeholder="0000000000000"
              className="sm:col-span-2"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
          <div className="mb-4 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-rainbow-purple" />
            <h2 className="font-display text-lg font-bold text-brand-navy">QRIS Dinamis</h2>
          </div>
          <p className="mb-4 text-sm text-brand-navy/60">
            QRIS per cabang untuk POS kasir & checkout aplikasi. Merchant PAN wajib agar QR bisa digenerate. Jika kosong, sistem coba pakai env <code className="text-xs">QRIS_MERCHANT_PAN</code>.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Merchant PAN *"
              value={form.qris?.merchantPan ?? ''}
              onChange={(e) => updateQris('merchantPan', e.target.value)}
              placeholder="936008xxxxxxxxxxxx"
              className="sm:col-span-2"
            />
            <Input
              label="Nama Merchant"
              value={form.qris?.merchantName ?? ''}
              onChange={(e) => updateQris('merchantName', e.target.value)}
              placeholder={selected?.name ?? 'Nama toko di QRIS'}
            />
            <Input
              label="Kota Merchant"
              value={form.qris?.merchantCity ?? ''}
              onChange={(e) => updateQris('merchantCity', e.target.value)}
              placeholder="JAKARTA"
            />
            <Input
              label="NMID (opsional)"
              value={form.qris?.nmid ?? ''}
              onChange={(e) => updateQris('nmid', e.target.value)}
              placeholder="IDxxxxxxxx"
            />
            <Input
              label="MCC (opsional)"
              value={form.qris?.mcc ?? ''}
              onChange={(e) => updateQris('mcc', e.target.value)}
              placeholder="0000"
            />
          </div>
        </div>

        <Button variant="rainbow" disabled={pending} onClick={save}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan Pembayaran
        </Button>
      </div>
    </div>
  );
}
