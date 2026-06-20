'use client';

import { useMemo, useState, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ClipboardCheck,
  History,
  Package,
  Plus,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@aww/shared';
import {
  approveStockOpname,
  cancelStockOpname,
  createStockOpname,
  recordStockMovement,
  updateOpnameCash,
  updateOpnameLine,
  upsertInventoryItem,
} from '@/app/actions/inventory';
import { toast } from '@/lib/toast';

type InventoryItem = {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  unit: string;
  unitCost: number;
  minStock: number;
  currentStock: number;
  lastCountedAt: Date | string | null;
};

type StockMovement = {
  id: string;
  type: string;
  qty: number;
  reference: string | null;
  createdAt: Date | string;
  item: { name: string; unit: string; sku: string | null };
};

type OpnameLine = {
  id: string;
  systemQty: number;
  physicalQty: number;
  variance: number;
  varianceCost: number | null;
  item: { name: string; unit: string; sku: string | null };
};

type StockOpname = {
  id: string;
  status: string;
  period: Date | string;
  cashExpected: number | null;
  cashActual: number | null;
  cashVariance: number | null;
  notes: string | null;
  createdAt: Date | string;
  lines: OpnameLine[];
};

interface InventoryDashboardProps {
  branches: { id: string; name: string; code: string }[];
  initialBranchId: string;
  items: InventoryItem[];
  movements: StockMovement[];
  opnames: StockOpname[];
  summary: {
    itemCount: number;
    lowStockCount: number;
    totalValue: number;
    lowStock: InventoryItem[];
    activeOpname: StockOpname | null;
  };
}

type Tab = 'items' | 'movements' | 'opname' | 'history';

const CATEGORIES = ['Supplies', 'Chemical', 'Packaging', 'Equipment', 'Lainnya'];

type OpnameStep = 'count' | 'cash' | 'review';

function parseQty(val: string): number {
  const normalized = val.trim().replace(',', '.');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

function inferOpnameStep(activeOpname: StockOpname | null, urlStep: string | null): OpnameStep {
  if (urlStep === 'count' || urlStep === 'cash' || urlStep === 'review') return urlStep;
  if (!activeOpname) return 'count';
  if (activeOpname.cashExpected != null && activeOpname.cashActual != null) return 'review';
  return 'count';
}

function buildInventoryUrl(branchId: string, tab?: Tab, step?: OpnameStep) {
  const params = new URLSearchParams({ branch: branchId });
  if (tab) params.set('tab', tab);
  if (step) params.set('step', step);
  return `/owner/inventory?${params.toString()}`;
}

export function InventoryDashboard({
  branches,
  initialBranchId,
  items: initialItems,
  movements: initialMovements,
  opnames: initialOpnames,
  summary: initialSummary,
}: InventoryDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') as Tab | null;
  const urlStep = searchParams.get('step');

  const [tab, setTab] = useState<Tab>(
    urlTab && ['items', 'movements', 'opname', 'history'].includes(urlTab) ? urlTab : 'items'
  );
  const [branchId, setBranchId] = useState(initialBranchId);
  const [items, setItems] = useState(initialItems);
  const [movements] = useState(initialMovements);
  const [opnames] = useState(initialOpnames);
  const [summary] = useState(initialSummary);
  const [pending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'Supplies',
    unit: 'pcs',
    unitCost: '0',
    minStock: '5',
    currentStock: '0',
  });

  const [moveForm, setMoveForm] = useState({ itemId: '', type: 'IN' as 'IN' | 'OUT', qty: '', ref: '' });
  const [opnameStep, setOpnameStep] = useState<OpnameStep>(() =>
    inferOpnameStep(initialSummary.activeOpname, urlStep)
  );
  const [cashForm, setCashForm] = useState({
    expected: initialSummary.activeOpname?.cashExpected != null ? String(initialSummary.activeOpname.cashExpected) : '',
    actual: initialSummary.activeOpname?.cashActual != null ? String(initialSummary.activeOpname.cashActual) : '',
    notes: initialSummary.activeOpname?.notes ?? '',
  });
  const [lineEdits, setLineEdits] = useState<Record<string, string>>({});
  const [activeOpname, setActiveOpname] = useState(initialSummary.activeOpname);

  const lowItems = useMemo(() => items.filter((i) => i.currentStock <= i.minStock), [items]);

  const syncUrl = useCallback(
    (nextTab: Tab, nextStep?: OpnameStep) => {
      const href = buildInventoryUrl(branchId, nextTab, nextTab === 'opname' ? nextStep : undefined);
      router.replace(href, { scroll: false });
    },
    [branchId, router]
  );

  function refreshData(nextTab = tab, nextStep = opnameStep) {
    syncUrl(nextTab, nextStep);
    router.refresh();
  }

  function handleAddItem() {
    startTransition(async () => {
      try {
        await upsertInventoryItem({
          branchId,
          name: form.name,
          sku: form.sku || undefined,
          category: form.category,
          unit: form.unit,
          unitCost: parseFloat(form.unitCost) || 0,
          minStock: parseFloat(form.minStock) || 0,
          currentStock: parseFloat(form.currentStock) || 0,
        });
        toast.success('Item inventori ditambahkan');
        setShowForm(false);
        refreshData('items');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
      }
    });
  }

  function handleMovement() {
    startTransition(async () => {
      try {
        await recordStockMovement({
          branchId,
          itemId: moveForm.itemId,
          type: moveForm.type,
          qty: parseFloat(moveForm.qty),
          reference: moveForm.ref || undefined,
        });
        toast.success('Pergerakan stok dicatat');
        refreshData('movements');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal');
      }
    });
  }

  function startOpname() {
    startTransition(async () => {
      try {
        await createStockOpname(branchId);
        toast.success('Sesi opname dimulai');
        setTab('opname');
        setOpnameStep('count');
        refreshData('opname', 'count');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal memulai opname');
      }
    });
  }

  function saveLineCounts() {
    if (!activeOpname) return;
    startTransition(async () => {
      try {
        const updatedLines = [];
        for (const line of activeOpname.lines) {
          const val = lineEdits[line.id] ?? String(line.physicalQty);
          const physicalQty = parseQty(val);
          const updated = await updateOpnameLine({
            branchId,
            lineId: line.id,
            physicalQty,
          });
          updatedLines.push({
            ...line,
            physicalQty: updated.physicalQty,
            variance: updated.variance,
            varianceCost: updated.varianceCost,
          });
        }
        setActiveOpname({ ...activeOpname, lines: updatedLines });
        setOpnameStep('cash');
        syncUrl('opname', 'cash');
        toast.success('Hitungan fisik disimpan');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
      }
    });
  }

  function saveCash() {
    if (!activeOpname) return;
    startTransition(async () => {
      try {
        const cashExpected = parseQty(cashForm.expected);
        const cashActual = parseQty(cashForm.actual);
        const updated = await updateOpnameCash({
          branchId,
          opnameId: activeOpname.id,
          cashExpected,
          cashActual,
          notes: cashForm.notes || undefined,
        });
        setActiveOpname({
          ...activeOpname,
          cashExpected: updated.cashExpected,
          cashActual: updated.cashActual,
          cashVariance: updated.cashVariance,
          notes: updated.notes,
        });
        setOpnameStep('review');
        syncUrl('opname', 'review');
        toast.success('Rekonsiliasi kas disimpan');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal');
      }
    });
  }

  function approveOpname() {
    if (!activeOpname) return;
    startTransition(async () => {
      try {
        await approveStockOpname(activeOpname.id, branchId);
        toast.success('Opname disetujui — stok disesuaikan');
        setActiveOpname(null);
        setOpnameStep('count');
        refreshData('history');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal approve');
      }
    });
  }

  function cancelOpname() {
    if (!activeOpname) return;
    startTransition(async () => {
      try {
        await cancelStockOpname(activeOpname.id, branchId);
        toast.success('Opname dibatalkan');
        setActiveOpname(null);
        setOpnameStep('count');
        refreshData('opname');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal');
      }
    });
  }

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: 'items', label: 'Master Stok', icon: Package },
    { id: 'movements', label: 'Masuk/Keluar', icon: History },
    { id: 'opname', label: 'Stock Opname', icon: ClipboardCheck },
    { id: 'history', label: 'Riwayat Opname', icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      {branches.length > 1 && (
        <Select
          id="branch"
          label="Cabang"
          value={branchId}
          onChange={(e) => {
            const nextBranch = e.target.value;
            setBranchId(nextBranch);
            router.push(buildInventoryUrl(nextBranch, tab, tab === 'opname' ? opnameStep : undefined));
          }}
          options={branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total Item" value={String(summary.itemCount)} icon={Package} />
        <SummaryCard
          title="Stok Menipis"
          value={String(summary.lowStockCount)}
          icon={AlertTriangle}
          warn={summary.lowStockCount > 0}
        />
        <SummaryCard title="Nilai Inventori" value={formatCurrency(summary.totalValue)} icon={TrendingDown} />
        <SummaryCard
          title="Opname Aktif"
          value={activeOpname ? 'Berjalan' : 'Tidak ada'}
          icon={ClipboardCheck}
          warn={!!activeOpname}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            variant={tab === t.id ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              setTab(t.id);
              syncUrl(t.id, t.id === 'opname' ? opnameStep : undefined);
            }}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'items' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <p className="text-sm text-brand-navy/60">
              {lowItems.length > 0
                ? `${lowItems.length} item perlu restock`
                : 'Semua stok dalam batas aman'}
            </p>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4" /> Tambah Item
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="DET-001" />
                <Select label="Kategori" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
                <Input label="Satuan" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                <Input label="Harga Satuan (Rp)" type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} />
                <Input label="Stok Minimum" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                <Input label="Stok Awal" type="number" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
                <div className="flex items-end">
                  <Button onClick={handleAddItem} disabled={pending || !form.name}>Simpan</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const low = item.currentStock <= item.minStock;
              return (
                <Card key={item.id} className={low ? 'border-amber-400' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold text-brand-navy">{item.name}</p>
                        <p className="text-xs text-brand-navy/50">
                          {item.sku ? `${item.sku} · ` : ''}{item.category} · {item.unit}
                        </p>
                      </div>
                      {low && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    </div>
                    <p className="mt-2 font-display text-2xl font-bold">{item.currentStock}</p>
                    <p className="text-xs text-brand-navy/50">
                      Min: {item.minStock} · Nilai: {formatCurrency(item.currentStock * item.unitCost)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'movements' && (
        <Card>
          <CardHeader><CardTitle>Catat Masuk / Keluar Stok</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Item"
              value={moveForm.itemId}
              onChange={(e) => setMoveForm({ ...moveForm, itemId: e.target.value })}
              options={[{ value: '', label: 'Pilih item...' }, ...items.map((i) => ({ value: i.id, label: i.name }))]}
            />
            <Select
              label="Tipe"
              value={moveForm.type}
              onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value as 'IN' | 'OUT' })}
              options={[
                { value: 'IN', label: 'Masuk (IN)' },
                { value: 'OUT', label: 'Keluar (OUT)' },
              ]}
            />
            <Input label="Jumlah" type="number" value={moveForm.qty} onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })} />
            <Input label="Referensi" value={moveForm.ref} onChange={(e) => setMoveForm({ ...moveForm, ref: e.target.value })} placeholder="PO-001 / Pemakaian harian" />
            <Button onClick={handleMovement} disabled={pending || !moveForm.itemId || !moveForm.qty}>Catat</Button>
          </CardContent>
          <CardContent className="border-t pt-4">
            <div className="space-y-2">
              {movements.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span>
                    <span className={m.type === 'IN' ? 'text-rainbow-green' : 'text-red-500'}>{m.type}</span>
                    {' '}{m.qty} {m.item.unit} — {m.item.name}
                    {m.reference && <span className="text-brand-navy/40"> ({m.reference})</span>}
                  </span>
                  <span className="text-brand-navy/40">{new Date(m.createdAt).toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'opname' && (
        <div className="space-y-4">
          {!activeOpname ? (
            <Card>
              <CardContent className="p-6 text-center">
                <ClipboardCheck className="mx-auto h-12 w-12 text-brand-orange" />
                <h3 className="mt-3 font-display text-lg font-bold">Mulai Stock Opname</h3>
                <p className="mt-1 text-sm text-brand-navy/60">
                  Snapshot stok sistem → hitung fisik → rekonsiliasi kas → approve penyesuaian
                </p>
                <Button className="mt-4" onClick={startOpname} disabled={pending || items.length === 0}>
                  Buat Sesi Opname Baru
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex gap-2">
                {(['count', 'cash', 'review'] as const).map((s, i) => (
                  <div
                    key={s}
                    className={`flex-1 rounded-lg border p-3 text-center text-sm ${
                      opnameStep === s ? 'border-brand-orange bg-brand-orange/10 font-semibold' : 'border-brand-navy/10'
                    }`}
                  >
                    {i + 1}. {s === 'count' ? 'Hitung Fisik' : s === 'cash' ? 'Rekonsiliasi Kas' : 'Review & Approve'}
                  </div>
                ))}
              </div>

              {opnameStep === 'count' && (
                <Card>
                  <CardHeader><CardTitle>Hitungan Fisik per Item</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {activeOpname.lines.map((line) => (
                      <div key={line.id} className="grid grid-cols-4 items-center gap-2 text-sm">
                        <span className="col-span-2 font-medium">{line.item.name}</span>
                        <span className="text-brand-navy/50">Sistem: {line.systemQty}</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={lineEdits[line.id] ?? String(line.physicalQty)}
                          onChange={(e) => setLineEdits({ ...lineEdits, [line.id]: e.target.value })}
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button onClick={saveLineCounts} disabled={pending}>Lanjut ke Kas</Button>
                      <Button variant="outline" onClick={cancelOpname} disabled={pending}>Batalkan</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {opnameStep === 'cash' && (
                <Card>
                  <CardHeader><CardTitle>Rekonsiliasi Kas Fisik</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <Input label="Kas Seharusnya (Rp)" type="number" value={cashForm.expected} onChange={(e) => setCashForm({ ...cashForm, expected: e.target.value })} />
                    <Input label="Kas Aktual (Rp)" type="number" value={cashForm.actual} onChange={(e) => setCashForm({ ...cashForm, actual: e.target.value })} />
                    <Input label="Catatan" className="sm:col-span-2" value={cashForm.notes} onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })} />
                    <div className="flex gap-2">
                      <Button onClick={saveCash} disabled={pending}>Lanjut Review</Button>
                      <Button variant="outline" onClick={() => {
                        setOpnameStep('count');
                        syncUrl('opname', 'count');
                      }}>Kembali</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {opnameStep === 'review' && (
                <Card>
                  <CardHeader><CardTitle>Review & Approve Opname</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {activeOpname.lines.map((line) => {
                      const v = line.variance;
                      return (
                        <div key={line.id} className="flex justify-between text-sm">
                          <span>{line.item.name}</span>
                          <span>
                            {line.systemQty} → {line.physicalQty}{' '}
                            <span className={v !== 0 ? (v > 0 ? 'text-rainbow-green' : 'text-red-500') : ''}>
                              ({v > 0 ? '+' : ''}{v})
                            </span>
                          </span>
                        </div>
                      );
                    })}
                    {activeOpname.cashExpected != null && (
                      <div className="border-t pt-3 text-sm">
                        <p>Kas: {formatCurrency(activeOpname.cashExpected)} → {formatCurrency(activeOpname.cashActual ?? 0)}</p>
                        <p>Selisih kas: {formatCurrency(activeOpname.cashVariance ?? 0)}</p>
                      </div>
                    )}
                    <Button onClick={approveOpname} disabled={pending}>Approve & Sesuaikan Stok</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {opnames.filter((o) => o.status === 'APPROVED').map((o) => {
            const totalVariance = o.lines.reduce((s, l) => s + Math.abs(l.varianceCost ?? 0), 0);
            return (
              <Card key={o.id}>
                <CardContent className="flex justify-between p-4">
                  <div>
                    <p className="font-semibold">{new Date(o.period).toLocaleDateString('id-ID')}</p>
                    <p className="text-sm text-brand-navy/60">{o.lines.length} item · Selisih nilai {formatCurrency(totalVariance)}</p>
                    {o.cashVariance != null && (
                      <p className="text-sm text-brand-navy/60">Selisih kas: {formatCurrency(o.cashVariance)}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-rainbow-green/15 px-3 py-1 text-xs font-semibold text-rainbow-green">
                    {o.status}
                  </span>
                </CardContent>
              </Card>
            );
          })}
          {opnames.filter((o) => o.status === 'APPROVED').length === 0 && (
            <p className="text-center text-brand-navy/50">Belum ada opname yang disetujui</p>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  warn,
}: {
  title: string;
  value: string;
  icon: typeof Package;
  warn?: boolean;
}) {
  return (
    <Card className={warn ? 'border-amber-400' : ''}>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-8 w-8 ${warn ? 'text-amber-500' : 'text-brand-orange'}`} />
        <div>
          <p className="text-xs text-brand-navy/50">{title}</p>
          <p className="font-display text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
