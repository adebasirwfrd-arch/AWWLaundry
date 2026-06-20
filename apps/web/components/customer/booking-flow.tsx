'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Phone,
  User,
  Calendar,
  Sparkles,
  Copy,
  PartyPopper,
} from 'lucide-react';
import { RainbowBubbleField } from '@/components/animations/rainbow-bubble-field';
import { CelebrationBurst } from '@/components/animations/celebration-burst';
import { WaterDropletMascot } from '@/components/brand/water-droplet-mascot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPickupRequest } from '@/app/actions/pickup';
import { formatCurrency } from '@aww/shared';

interface Service {
  id: string;
  name: string;
  pricePerKg: number;
  estimatedHours: number;
}

const SLOTS = ['08:00 – 10:00', '10:00 – 12:00', '13:00 – 15:00', '15:00 – 17:00', '17:00 – 19:00'];

const STEPS = ['Layanan', 'Jadwal', 'Alamat', 'Konfirmasi'];

export function BookingFlow({ services }: { services: Service[] }) {
  const list = services.length
    ? services
    : [
        { id: '1', name: 'Cuci Kering', pricePerKg: 8000, estimatedHours: 24 },
        { id: '2', name: 'Cuci Setrika', pricePerKg: 12000, estimatedHours: 48 },
        { id: '3', name: 'Cuci Express', pricePerKg: 15000, estimatedHours: 6 },
      ];

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState(list[0]?.id ?? '');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(SLOTS[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [estKg, setEstKg] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [result, setResult] = useState<{ trackingCode: string; branchName: string; branchPhone: string | null } | null>(null);

  const service = list.find((s) => s.id === serviceId);
  const minDate = new Date().toISOString().slice(0, 10);

  const canNext =
    (step === 0 && !!serviceId) ||
    (step === 1 && !!date && !!slot) ||
    (step === 2 && !!name && !!phone && !!address) ||
    step === 3;

  async function submit() {
    setLoading(true);
    try {
      const res = await createPickupRequest({
        customerName: name,
        customerPhone: phone,
        address,
        serviceName: service?.name ?? '',
        scheduleDate: date,
        scheduleSlot: slot,
        estimatedKg: estKg ? parseFloat(estKg) : undefined,
        notes: notes || undefined,
      });
      setResult(res);
      setCelebrate(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal memesan');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
        <RainbowBubbleField density="high" />
        <CelebrationBurst show={celebrate} onDone={() => setCelebrate(false)} />
        <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-aww-lg">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-aww-payment shadow-aww-glow-rainbow">
            <PartyPopper className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-brand-navy">Pesanan Diterima! 🎉</h1>
          <p className="mt-2 text-brand-navy/60">
            Kurir kami akan menjemput cucian Anda pada <b>{new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</b>, {slot}.
          </p>

          <div className="my-6 rounded-2xl border-2 border-dashed border-brand-navy/15 bg-brand-sky/5 p-5">
            <p className="text-xs uppercase tracking-wider text-brand-navy/40">Kode Lacak</p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <p className="font-mono text-2xl font-bold text-brand-navy">{result.trackingCode}</p>
              <button
                onClick={() => navigator.clipboard?.writeText(result.trackingCode)}
                className="text-brand-navy/40 hover:text-brand-navy"
                aria-label="Salin kode"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-brand-navy/50">Simpan kode ini untuk melacak pesanan</p>
          </div>

          <div className="space-y-2 text-left text-sm">
            <Row label="Layanan" value={service?.name ?? ''} />
            <Row label="Cabang" value={result.branchName} />
            {result.branchPhone && <Row label="Kontak" value={result.branchPhone} />}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <Link href={`/track?order=${result.trackingCode}`}>
              <Button variant="rainbow" className="w-full">Lacak Pesanan</Button>
            </Link>
            <Link href="/welcome">
              <Button variant="outline" className="w-full">Kembali ke Beranda</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <RainbowBubbleField density="normal" />
      <div className="pointer-events-none absolute inset-0 bg-aww-brand-hero" />

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        <Link href="/welcome" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-navy/60 hover:text-brand-navy">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all ${
                    i < step ? 'bg-rainbow-green text-white' : i === step ? 'scale-110 bg-aww-rainbow text-white shadow-aww-glow-rainbow' : 'bg-brand-navy/10 text-brand-navy/40'
                  }`}
                >
                  {i < step ? <Check className="h-5 w-5" /> : i + 1}
                </div>
                <span className={`mt-1 text-[11px] ${i === step ? 'font-semibold text-brand-navy' : 'text-brand-navy/40'}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-1 h-1 flex-1 rounded-full ${i < step ? 'bg-rainbow-green' : 'bg-brand-navy/10'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-aww-lg sm:p-8">
          {/* STEP 0 — Service */}
          {step === 0 && (
            <div>
              <h2 className="mb-1 font-display text-2xl font-bold text-brand-navy">Pilih Layanan</h2>
              <p className="mb-6 text-sm text-brand-navy/55">Mau dicuci seperti apa hari ini?</p>
              <div className="space-y-3">
                {list.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setServiceId(s.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                      serviceId === s.id ? 'border-rainbow-cyan bg-rainbow-cyan/5 shadow-aww-sm' : 'border-brand-navy/10 hover:border-rainbow-cyan/40'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-brand-navy">{s.name}</p>
                      <p className="flex items-center gap-1 text-xs text-brand-navy/50">
                        <Clock className="h-3 w-3" /> ± {s.estimatedHours} jam
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-brand-orange">{formatCurrency(s.pricePerKg)}</p>
                      <p className="text-xs text-brand-navy/40">/kg</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1 — Schedule */}
          {step === 1 && (
            <div>
              <h2 className="mb-1 font-display text-2xl font-bold text-brand-navy">Kapan Dijemput?</h2>
              <p className="mb-6 text-sm text-brand-navy/55">Pilih tanggal & waktu yang pas untuk Anda</p>
              <Input
                id="date"
                label="Tanggal Jemput"
                type="date"
                min={minDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="mb-2 mt-5 text-sm font-medium text-brand-navy">Slot Waktu</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SLOTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`rounded-xl border-2 px-3 py-3 text-sm font-medium transition-all ${
                      slot === s ? 'border-rainbow-cyan bg-rainbow-cyan/10 text-brand-navy shadow-aww-sm' : 'border-brand-navy/10 text-brand-navy/60 hover:border-rainbow-cyan/40'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 — Address */}
          {step === 2 && (
            <div>
              <h2 className="mb-1 font-display text-2xl font-bold text-brand-navy">Alamat Jemput</h2>
              <p className="mb-6 text-sm text-brand-navy/55">Ke mana kurir kami menjemput cucian?</p>
              <div className="space-y-4">
                <Input id="name" label="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} placeholder="Budi Santoso" />
                <Input id="phone" label="No. WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081234567890" />
                <div className="space-y-1.5">
                  <label htmlFor="addr" className="block text-sm font-medium text-brand-navy">Alamat Lengkap</label>
                  <textarea
                    id="addr"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Jl. Mawar No. 12, RT 03/RW 05, Kebayoran Baru..."
                    className="w-full rounded-aww-md border border-aww-border bg-white px-4 py-3 text-brand-navy placeholder:text-aww-text-muted focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/30"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input id="kg" label="Estimasi Berat (kg, opsional)" type="number" step="0.5" value={estKg} onChange={(e) => setEstKg(e.target.value)} placeholder="3" />
                  <Input id="notes" label="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Pisahkan baju putih" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Review */}
          {step === 3 && (
            <div>
              <h2 className="mb-1 font-display text-2xl font-bold text-brand-navy">Konfirmasi Pesanan</h2>
              <p className="mb-6 text-sm text-brand-navy/55">Periksa detail sebelum kami jemput</p>
              <div className="space-y-3 rounded-2xl bg-brand-sky/5 p-5">
                <Review icon={Sparkles} label="Layanan" value={`${service?.name} · ${formatCurrency(service?.pricePerKg ?? 0)}/kg`} />
                <Review icon={Calendar} label="Jadwal" value={`${new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} · ${slot}`} />
                <Review icon={User} label="Nama" value={name} />
                <Review icon={Phone} label="WhatsApp" value={phone} />
                <Review icon={MapPin} label="Alamat" value={address} />
                {estKg && <Review icon={Clock} label="Estimasi" value={`${estKg} kg ≈ ${formatCurrency(parseFloat(estKg) * (service?.pricePerKg ?? 0))}`} />}
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-brand-navy/50">
                <WaterDropletMascot className="h-10 w-10 shrink-0" />
                Harga final dihitung setelah cucian ditimbang saat penjemputan. Pembayaran bisa tunai/QRIS saat antar balik.
              </p>
            </div>
          )}

          {/* Nav buttons */}
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                Kembali
              </Button>
            )}
            {step < 3 ? (
              <Button variant="primary" onClick={() => setStep(step + 1)} disabled={!canNext} className="flex-1 group">
                Lanjut <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            ) : (
              <Button variant="rainbow" onClick={submit} disabled={loading} className="flex-1">
                {loading ? 'Memproses...' : 'Konfirmasi Pesanan'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-brand-navy/50">{label}</span>
      <span className="font-medium text-brand-navy">{value}</span>
    </div>
  );
}

function Review({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-rainbow-cyan" />
      <div>
        <p className="text-xs text-brand-navy/45">{label}</p>
        <p className="font-medium text-brand-navy">{value}</p>
      </div>
    </div>
  );
}
