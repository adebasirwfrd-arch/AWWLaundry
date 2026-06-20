'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Gift,
  LogOut,
  Pencil,
  Camera,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { LOYALTY_POINTS_PER_KG, LOYALTY_REDEEM_COST, LOYALTY_APP_ORDER_BONUS, kgNeededForRedemption } from '@aww/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  removeCustomerAvatar,
  updateCustomerProfile,
  uploadCustomerAvatar,
} from '@/app/actions/customer-profile';

export interface CustomerProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
  avatarUrl: string | null;
  loyaltyPoints: number;
  orderCount: number;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function CustomerProfileCard({ profile }: { profile: CustomerProfileData }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatarUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const displayAvatar = previewUrl ?? avatarUrl;

  function resetForm() {
    setName(profile.name);
    setPhone(profile.phone);
    setAddress(profile.address);
    setAvatarUrl(profile.avatarUrl);
    setPreviewUrl(null);
    setError(null);
    setEditing(false);
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const { avatarUrl: url } = await uploadCustomerAvatar(fd);
      setAvatarUrl(url);
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
      router.refresh();
    } catch (err) {
      setPreviewUrl(null);
      URL.revokeObjectURL(localPreview);
      setError(err instanceof Error ? err.message : 'Gagal mengunggah foto');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setError(null);
    setUploading(true);
    try {
      await removeCustomerAvatar();
      setAvatarUrl(null);
      setPreviewUrl(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus foto');
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await updateCustomerProfile({ name, phone, address, avatarUrl });
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menyimpan profil');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold text-brand-navy">Profil Saya</h1>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit Profil
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl bg-aww-header p-6 text-white shadow-aww-lg">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-aww-rainbow text-2xl font-bold shadow-aww-glow-rainbow ring-4 ring-white/20">
              {displayAvatar ? (
                <Image
                  src={displayAvatar}
                  alt={name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                initials(name || 'P')
              )}
            </div>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || pending}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-navy shadow-aww-md transition-transform hover:scale-105 disabled:opacity-60"
                  aria-label="Ganti foto profil"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarPick}
                />
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                label=""
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                className="border-white/30 bg-white/10 text-white placeholder:text-white/50"
                disabled={pending}
              />
            ) : (
              <>
                <p className="truncate font-display text-xl font-bold">{name}</p>
                <p className="truncate text-sm text-white/70">{profile.email}</p>
              </>
            )}
          </div>
        </div>

        {editing && displayAvatar && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            disabled={uploading || pending}
            className="mt-3 text-xs text-white/80 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Hapus foto profil
          </button>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              <Sparkles className="h-3.5 w-3.5 text-rainbow-yellow" /> Poin Loyalti
            </p>
            <p className="font-display text-2xl font-extrabold">{profile.loyaltyPoints}</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
            <p className="text-xs text-white/70">Total Pesanan</p>
            <p className="font-display text-2xl font-extrabold">{profile.orderCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-brand-navy/10 bg-white p-5 shadow-aww-sm">
        <div className="mb-3 flex items-center gap-2">
          <Gift className="h-5 w-5 text-brand-orange" />
          <h2 className="font-display text-base font-bold text-brand-navy">Program Poin Loyalty</h2>
        </div>
        <ul className="space-y-2 text-sm text-brand-navy/70">
          <li>
            • Pesan via aplikasi = <strong className="text-brand-navy">+{LOYALTY_APP_ORDER_BONUS} poin</strong> (setelah kasir konfirmasi)
          </li>
          <li>
            • Setiap <strong className="text-brand-navy">1 kg</strong> cucian ={' '}
            <strong className="text-brand-navy">{LOYALTY_POINTS_PER_KG} poin</strong>
          </li>
          <li>
            • <strong className="text-brand-navy">{LOYALTY_REDEEM_COST} poin</strong> = gratis cuci{' '}
            <strong className="text-brand-navy">1 kg</strong>
          </li>
          <li>
            • Setara total cuci ~<strong className="text-brand-navy">{kgNeededForRedemption()} kg</strong> untuk 1 kg
            gratis berikutnya
          </li>
        </ul>
        <p className="mt-3 rounded-xl bg-brand-sky/10 px-3 py-2 text-xs text-brand-navy/60">
          Poin ditambahkan setelah kasir konfirmasi pesanan & pembayaran. Batal sebelum konfirmasi = bonus tidak diberikan. Redeem tersedia saat pesan kiloan via aplikasi.
        </p>
      </div>

      {editing ? (
        <div className="space-y-4 rounded-3xl border border-rainbow-cyan/30 bg-white p-5 shadow-aww-sm">
          <p className="font-display text-base font-bold text-brand-navy">Edit Profil</p>

          <Input
            label="Telepon"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            disabled={pending}
          />

          <Input
            label="Alamat"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Alamat lengkap"
            disabled={pending}
          />

          <div className="flex items-center gap-3 rounded-xl bg-brand-sky/5 px-3 py-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-sky/10 text-rainbow-cyan">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-brand-navy/45">Email (login)</p>
              <p className="text-sm font-medium text-brand-navy">{profile.email}</p>
            </div>
          </div>
          <p className="text-xs text-brand-navy/45">Email login tidak dapat diubah dari sini.</p>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={resetForm} disabled={pending || uploading}>
              <X className="h-4 w-4" /> Batal
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={pending || uploading}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Simpan
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-3xl border border-brand-navy/10 bg-white p-5 shadow-aww-sm">
          <InfoRow icon={Phone} label="Telepon" value={phone || 'Belum diatur'} />
          <InfoRow icon={Mail} label="Email" value={profile.email} />
          <InfoRow icon={MapPin} label="Alamat" value={address || 'Belum diatur'} />
        </div>
      )}

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3.5 text-sm font-semibold text-red-500 shadow-aww-sm transition-colors hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" /> Keluar dari Akun
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-sky/10 text-rainbow-cyan">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-brand-navy/45">{label}</p>
        <p className="font-medium text-brand-navy">{value}</p>
      </div>
    </div>
  );
}
