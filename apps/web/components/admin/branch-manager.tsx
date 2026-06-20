'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  Building2,
  Plus,
  Save,
  Loader2,
  Users,
  UserPlus,
  Trash2,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROLE_LABELS } from '@aww/shared';
import {
  createBranch,
  loadBranchDetail,
  createBranchStaff,
  updateBranchStaff,
  removeBranchStaff,
  updateBranchFull,
  upsertBranchPricingAction,
} from '@/app/actions/branch-admin';

interface BranchListItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

function rupiah(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
}

export function BranchManager({
  branches: initialBranches,
  serviceTypes,
}: {
  branches: BranchListItem[];
  serviceTypes: Array<{ id: string; name: string; pricePerKg: number }>;
}) {
  const [branches, setBranches] = useState(initialBranches);
  const [selectedId, setSelectedId] = useState(initialBranches[0]?.id ?? '');
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof loadBranchDetail>> | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [branchForm, setBranchForm] = useState({ code: '', name: '', address: '', phone: '', isActive: true });
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CASHIER' as 'CASHIER' | 'WORKER' | 'MANAGER',
    phone: '',
  });
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ code: '', name: '', address: '', phone: '' });

  function loadDetail(id: string) {
    setSelectedId(id);
    startTransition(async () => {
      try {
        const d = await loadBranchDetail(id);
        setDetail(d);
        setBranchForm({
          code: d.branch.code,
          name: d.branch.name,
          address: d.branch.address ?? '',
          phone: d.branch.phone ?? '',
          isActive: d.branch.isActive,
        });
        const pmap: Record<string, string> = {};
        for (const svc of serviceTypes) {
          const o = d.branch.pricing.find((p) => p.serviceTypeId === svc.id);
          pmap[svc.id] = String(o?.pricePerKg ?? svc.pricePerKg);
        }
        setPrices(pmap);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Gagal memuat cabang');
      }
    });
  }

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run(action: () => Promise<unknown>, success: string, reload = true) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
        if (reload && selectedId) loadDetail(selectedId);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Gagal');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-navy/60">
          RBAC per cabang — kasir & pekerja hanya akses order cabang masing-masing.
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowNewBranch(true)}>
          <Plus className="h-4 w-4" /> Tambah Cabang
        </Button>
      </div>

      {showNewBranch && (
        <div className="rounded-2xl border border-rainbow-cyan/30 bg-brand-sky/5 p-5">
          <h3 className="font-semibold text-brand-navy">Cabang Baru</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Kode" value={newBranch.code} onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })} placeholder="JKT02" />
            <Input label="Nama" value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} />
            <Input label="Alamat" value={newBranch.address} onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })} />
            <Input label="Telepon" value={newBranch.phone} onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              variant="rainbow"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const res = await createBranch(newBranch);
                  setBranches((prev) => [...prev, { id: res.id, code: newBranch.code.toUpperCase(), name: newBranch.name, isActive: true }]);
                  setShowNewBranch(false);
                  setNewBranch({ code: '', name: '', address: '', phone: '' });
                  setSelectedId(res.id);
                  loadDetail(res.id);
                }, 'Cabang baru dibuat', false)
              }
            >
              Buat Cabang
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowNewBranch(false)}>Batal</Button>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-xl bg-brand-sky/10 px-4 py-2 text-sm text-brand-navy">{message}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="space-y-1 rounded-2xl border border-brand-navy/10 bg-white p-3 shadow-aww-sm">
          <p className="px-2 text-xs font-semibold uppercase tracking-wider text-brand-navy/40">Cabang</p>
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => loadDetail(b.id)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                selectedId === b.id ? 'bg-brand-sky/15 font-semibold text-brand-navy' : 'text-brand-navy/65 hover:bg-brand-navy/5'
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{b.name}</span>
              {!b.isActive && <span className="text-[10px] text-amber-600">off</span>}
              <ChevronRight className="h-4 w-4 opacity-30" />
            </button>
          ))}
        </div>

        {detail && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
              <h2 className="font-display text-lg font-bold text-brand-navy">{detail.branch.name}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input label="Kode Cabang" value={branchForm.code} onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })} />
                <Input label="Nama Cabang" value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
                <Input label="Alamat" value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
                <Input label="Telepon" value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={branchForm.isActive} onChange={(e) => setBranchForm({ ...branchForm, isActive: e.target.checked })} />
                Cabang aktif
              </label>
              <Button
                className="mt-4"
                variant="rainbow"
                disabled={pending}
                onClick={() => run(() => updateBranchFull({ id: detail.branch.id, ...branchForm }), 'Data cabang disimpan')}
              >
                <Save className="h-4 w-4" /> Simpan Cabang
              </Button>
            </div>

            <div className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
              <h3 className="font-semibold text-brand-navy">Override Harga/kg per Layanan</h3>
              <div className="mt-3 space-y-2">
                {serviceTypes.map((svc) => (
                  <div key={svc.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-brand-sky/5 px-3 py-2">
                    <span className="min-w-[120px] text-sm font-medium">{svc.name}</span>
                    <span className="text-xs text-brand-navy/45">default {rupiah(svc.pricePerKg)}</span>
                    <input
                      type="number"
                      value={prices[svc.id] ?? ''}
                      onChange={(e) => setPrices({ ...prices, [svc.id]: e.target.value })}
                      className="w-28 rounded-lg border border-brand-navy/15 px-3 py-1.5 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => upsertBranchPricingAction(detail.branch.id, svc.id, Number(prices[svc.id])),
                          'Harga diperbarui',
                          false
                        )
                      }
                    >
                      Simpan
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-brand-navy/10 bg-white p-6 shadow-aww-sm">
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-rainbow-cyan" />
                <h3 className="font-semibold text-brand-navy">Staff Cabang (RBAC)</h3>
              </div>

              <div className="mb-4 space-y-2">
                {detail.staff.length === 0 ? (
                  <p className="text-sm text-brand-navy/50">Belum ada kasir/pekerja di cabang ini.</p>
                ) : (
                  detail.staff.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-navy/10 px-3 py-2.5">
                      <div>
                        <p className="font-medium text-brand-navy">{s.name}</p>
                        <p className="text-xs text-brand-navy/50">{s.email} · {ROLE_LABELS[s.role]}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${s.isActive ? 'text-rainbow-green' : 'text-red-500'}`}>
                          {s.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            if (!confirm(`Hapus ${s.name} dari cabang ini?`)) return;
                            run(() => removeBranchStaff(s.id, detail.branch.id), 'Staff dihapus dari cabang');
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="rounded-xl border border-dashed border-brand-navy/15 bg-brand-sky/5 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
                  <UserPlus className="h-4 w-4" /> Tambah Akun Staff
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Nama" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                  <Input label="Email login" type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                  <Input label="Password" type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                  <Input label="Telepon" value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-brand-navy">Role</label>
                    <select
                      value={staffForm.role}
                      onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as typeof staffForm.role })}
                      className="h-11 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
                    >
                      <option value="CASHIER">Kasir</option>
                      <option value="WORKER">Pekerja</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </div>
                </div>
                <Button
                  className="mt-3"
                  variant="rainbow"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        createBranchStaff({
                          branchId: detail.branch.id,
                          ...staffForm,
                        }),
                      'Akun staff dibuat — hanya akses cabang ini',
                      true
                    )
                  }
                >
                  <Shield className="h-4 w-4" /> Buat Akun
                </Button>
              </div>
            </div>
          </div>
        )}

        {pending && !detail && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rainbow-cyan" />
          </div>
        )}
      </div>
    </div>
  );
}
