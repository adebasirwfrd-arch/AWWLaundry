'use client';

import { useMemo, useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ClipboardCheck,
  History,
  Landmark,
  Package,
  Plus,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@aww/shared';
import {
  approveStockOpname,
  cancelStockOpname,
  completeOpnameCountStep,
  createStockOpname,
  getStockOpnameDetail,
  recordStockMovement,
  rejectStockOpname,
  submitStockOpnameForApproval,
  updateOpnameCash,
  updateOpnameLine,
  upsertInventoryItem,
  getExpectedBranchCash,
} from '@/app/actions/inventory';
import { OpnameDetailModal, type OpnameDetailData } from '@/components/inventory/opname-detail-modal';
import { inferOpnameResumeStep } from '@/lib/opname-utils';
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
    unfinishedOpname: StockOpname | null;
    expectedCash: number;
    actualCash: number | null;
    cashVariance: number | null;
    pendingApprovalCount: number;
    lastOpnameApprovedAt: Date | string | null;
  };
  userRole: string;
  lockBranch?: boolean;
  branchLabel?: string;
  defaultTab?: Tab;
  basePath?: string;
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
  return inferOpnameResumeStep(activeOpname);
}

function buildInventoryUrl(basePath: string, branchId: string, tab?: Tab, step?: OpnameStep, lockBranch?: boolean) {
  const params = new URLSearchParams();
  if (!lockBranch) params.set('branch', branchId);
  if (tab) params.set('tab', tab);
  if (step) params.set('step', step);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function mapOpnameFromServer(created: {
  id: string;
  status: string;
  period: Date | string;
  cashExpected: number | null;
  cashActual: number | null;
  cashVariance: number | null;
  notes: string | null;
  createdAt: Date | string;
  lines: Array<{
    id: string;
    systemQty: number;
    physicalQty: number;
    variance: number;
    varianceCost: number | null;
    item: { name: string; unit: string; sku: string | null };
  }>;
}): StockOpname {
  return {
    id: created.id,
    status: created.status,
    period: created.period,
    cashExpected: created.cashExpected,
    cashActual: created.cashActual,
    cashVariance: created.cashVariance,
    notes: created.notes,
    createdAt: created.createdAt,
    lines: created.lines.map((l) => ({
      id: l.id,
      systemQty: l.systemQty,
      physicalQty: l.physicalQty,
      variance: l.variance,
      varianceCost: l.varianceCost,
      item: { name: l.item.name, unit: l.item.unit, sku: l.item.sku ?? null },
    })),
  };
}

function isHistoryOpname(opname: { status: string; notes: string | null }) {
  if (opname.status === 'APPROVED' || opname.status === 'REJECTED') return true;
  // Legacy: reject sebelumnya pakai status CANCELLED + catatan Ditolak
  if (opname.status === 'CANCELLED' && opname.notes?.includes('Ditolak')) return true;
  return false;
}

function historyStatusLabel(opname: { status: string; notes: string | null }) {
  if (opname.status === 'CANCELLED' && opname.notes?.includes('Ditolak')) return 'REJECTED';
  return opname.status;
}

function historyStatusStyle(status: string) {
  if (status === 'APPROVED') return 'bg-rainbow-green/15 text-rainbow-green';
  if (status === 'REJECTED') return 'bg-red-100 text-red-600';
  return 'bg-brand-navy/10 text-brand-navy';
}

export function InventoryDashboard({
  branches,
  initialBranchId,
  items: initialItems,
  movements: initialMovements,
  opnames: initialOpnames,
  summary: initialSummary,
  userRole,
  lockBranch = false,
  branchLabel,
  defaultTab,
  basePath = '/owner/inventory',
}: InventoryDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = (searchParams.get('tab') as Tab | null) ?? defaultTab;
  const urlStep = searchParams.get('step');

  const tabs = useMemo(() => {
    const movementLabel = userRole === 'CASHIER' ? 'Masuk Stok' : 'Masuk/Keluar';
    return [
      { id: 'items' as const, label: 'Master Stok', icon: Package },
      { id: 'movements' as const, label: movementLabel, icon: History },
      { id: 'opname' as const, label: 'Stock Opname', icon: ClipboardCheck },
      { id: 'history' as const, label: 'Riwayat Opname', icon: Wallet },
    ];
  }, [userRole]);
  const allowedTabs = useMemo(() => tabs.map((t) => t.id), [tabs]);

  const [tab, setTab] = useState<Tab>(() => {
    if (urlTab && allowedTabs.includes(urlTab)) return urlTab;
    if (defaultTab && allowedTabs.includes(defaultTab)) return defaultTab;
    return 'items';
  });
  const [branchId, setBranchId] = useState(initialBranchId);
  const [items, setItems] = useState(initialItems);
  const [movements, setMovements] = useState(initialMovements);
  const [opnames, setOpnames] = useState(initialOpnames);
  const [summary, setSummary] = useState(initialSummary);
  const [pending, startTransition] = useTransition();
  const [cashLoading, setCashLoading] = useState(false);
  const [opnameStarting, setOpnameStarting] = useState(false);

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
    inferOpnameStep(initialSummary.unfinishedOpname, urlStep)
  );
  const defaultExpectedCash =
    initialSummary.unfinishedOpname?.cashExpected != null
      ? String(initialSummary.unfinishedOpname.cashExpected)
      : String(initialSummary.expectedCash);
  const [cashForm, setCashForm] = useState({
    expected: defaultExpectedCash,
    actual: initialSummary.unfinishedOpname?.cashActual != null ? String(initialSummary.unfinishedOpname.cashActual) : '',
    notes: initialSummary.unfinishedOpname?.notes ?? '',
  });
  const [lineEdits, setLineEdits] = useState<Record<string, string>>({});
  const [activeOpname, setActiveOpname] = useState(initialSummary.unfinishedOpname);

  const isOwner = userRole === 'OWNER' || userRole === 'SUPER_ADMIN';
  const isCashier = userRole === 'CASHIER';
  const isManager = userRole === 'MANAGER';
  const canSubmitOpname = isCashier || isManager || isOwner;
  const canManageMaster = isOwner || isManager;
  const isPendingApproval = activeOpname?.status === 'PENDING_APPROVAL';
  const [detailOpname, setDetailOpname] = useState<OpnameDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const lowItems = useMemo(() => items.filter((i) => i.currentStock <= i.minStock), [items]);

  const cashExpectedAmount = parseQty(cashForm.expected);
  const cashActualAmount = parseQty(cashForm.actual);
  const cashVariancePreview = cashForm.actual.trim() ? cashActualAmount - cashExpectedAmount : null;
  const hasStockVariance = activeOpname?.lines.some((line) => line.variance !== 0) ?? false;
  const needsVarianceNote =
    (cashVariancePreview != null && cashVariancePreview !== 0) || hasStockVariance;
  const canProceedCash =
    cashForm.actual.trim() !== '' &&
    cashForm.expected.trim() !== '' &&
    (!needsVarianceNote || cashForm.notes.trim() !== '');

  const fillExpectedCash = useCallback(async () => {
    if (activeOpname?.cashExpected != null) return;
    try {
      const expected = await getExpectedBranchCash(branchId);
      setCashForm((prev) => (prev.expected ? prev : { ...prev, expected: String(expected) }));
    } catch {
      // Biarkan kosong jika gagal fetch — user bisa isi manual
    }
  }, [activeOpname?.cashExpected, branchId]);

  useEffect(() => {
    if (opnameStep === 'cash' && activeOpname && activeOpname.cashExpected == null) {
      void fillExpectedCash();
    }
  }, [opnameStep, activeOpname, fillExpectedCash]);

  useEffect(() => {
    setBranchId(initialBranchId);
    setItems(initialItems);
    setMovements(initialMovements);
    setOpnames(initialOpnames);
    setSummary(initialSummary);
    setActiveOpname((prev) => {
      const incoming = initialSummary.unfinishedOpname;
      if (incoming) return incoming;
      if (prev && ['DRAFT', 'COUNTING', 'PENDING_APPROVAL'].includes(prev.status)) return prev;
      return null;
    });
    setOpnameStep(inferOpnameStep(initialSummary.unfinishedOpname, urlStep));
    setMoveForm({ itemId: '', type: 'IN', qty: '', ref: '' });
    setCashForm({
      expected:
        initialSummary.unfinishedOpname?.cashExpected != null
          ? String(initialSummary.unfinishedOpname.cashExpected)
          : String(initialSummary.expectedCash),
      actual:
        initialSummary.unfinishedOpname?.cashActual != null
          ? String(initialSummary.unfinishedOpname.cashActual)
          : '',
      notes: initialSummary.unfinishedOpname?.notes ?? '',
    });
    setLineEdits({});
    setTab((current) => {
      if (urlTab && allowedTabs.includes(urlTab)) return urlTab;
      if (defaultTab && allowedTabs.includes(defaultTab)) return defaultTab;
      if (!allowedTabs.includes(current)) return 'items';
      return current;
    });
  }, [
    initialBranchId,
    initialItems,
    initialMovements,
    initialOpnames,
    initialSummary,
    urlStep,
    urlTab,
    defaultTab,
    allowedTabs,
  ]);

  const syncUrl = useCallback(
    (nextTab: Tab, nextStep?: OpnameStep) => {
      const href = buildInventoryUrl(basePath, branchId, nextTab, nextTab === 'opname' ? nextStep : undefined, lockBranch);
      router.replace(href, { scroll: false });
    },
    [basePath, branchId, lockBranch, router]
  );

  async function openOpnameDetail(opnameId: string) {
    setDetailLoading(true);
    try {
      const detail = await getStockOpnameDetail(opnameId);
      setDetailOpname({
        ...detail,
        period: new Date(detail.period).toISOString(),
        createdAt: new Date(detail.createdAt).toISOString(),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat detail');
    } finally {
      setDetailLoading(false);
    }
  }

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
    const movementType = isCashier ? 'IN' : moveForm.type;
    startTransition(async () => {
      try {
        await recordStockMovement({
          branchId,
          itemId: moveForm.itemId,
          type: movementType,
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
    if (opnameStarting) return;
    setOpnameStarting(true);
    void (async () => {
      try {
        const created = await createStockOpname(branchId);
        const mapped = mapOpnameFromServer(created);
        const resumeStep = inferOpnameResumeStep(created);
        setActiveOpname(mapped);
        setSummary((prev) => ({ ...prev, unfinishedOpname: mapped }));
        setTab('opname');
        setOpnameStep(resumeStep);
        syncUrl('opname', resumeStep);
        toast.success(
          resumeStep === 'count' ? 'Sesi opname dimulai' : 'Melanjutkan opname yang belum selesai'
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal memulai opname');
      } finally {
        setOpnameStarting(false);
      }
    })();
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
        await completeOpnameCountStep(activeOpname.id, branchId);
        setActiveOpname({ ...activeOpname, lines: updatedLines, status: 'COUNTING' });
        setOpnameStep('cash');
        syncUrl('opname', 'cash');
        toast.success('Hitungan fisik disimpan');
        void (async () => {
          try {
            const expected = await getExpectedBranchCash(branchId);
            setCashForm((prev) => ({ ...prev, expected: String(expected) }));
          } catch {
            setCashForm((prev) =>
              prev.expected ? prev : { ...prev, expected: String(initialSummary.expectedCash) }
            );
          }
        })();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
      }
    });
  }

  function saveCash() {
    if (!activeOpname) return;
    if (!cashForm.actual.trim()) {
      toast.error('Isi kas aktual hasil hitungan fisik di laci kasir');
      return;
    }
    if (needsVarianceNote && !cashForm.notes.trim()) {
      toast.error('Ada selisih stok atau kas — wajib isi catatan penjelasan');
      return;
    }
    setCashLoading(true);
    startTransition(async () => {
      try {
        const cashActual = parseQty(cashForm.actual);
        const updated = await updateOpnameCash({
          branchId,
          opnameId: activeOpname.id,
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
      } finally {
        setCashLoading(false);
      }
    });
  }

  function submitForApproval() {
    if (!activeOpname) return;
    startTransition(async () => {
      try {
        await submitStockOpnameForApproval(activeOpname.id, branchId);
        toast.success('Opname diajukan — owner akan menerima email & notifikasi');
        setActiveOpname(null);
        setOpnameStep('count');
        refreshData('opname');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal mengajukan');
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

  function rejectOpname() {
    if (!activeOpname) return;
    const reason = window.prompt('Alasan penolakan (opsional):') ?? undefined;
    startTransition(async () => {
      try {
        await rejectStockOpname(activeOpname.id, reason || undefined, branchId);
        toast.success('Opname ditolak — staff akan menerima notifikasi');
        setActiveOpname(null);
        setOpnameStep('count');
        refreshData('opname');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menolak');
      }
    });
  }

  function cancelOpname() {
    if (!activeOpname) return;
    if (!confirm('Batalkan stock opname ini? Sesi akan dihapus dan Anda bisa memulai baru.')) return;
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

  return (
    <div className="space-y-6">
      {lockBranch && branchLabel ? (
        <div className="rounded-xl border border-brand-navy/10 bg-white/70 px-4 py-3">
          <p className="text-xs font-medium text-brand-navy/50">Cabang</p>
          <p className="font-semibold text-brand-navy">{branchLabel}</p>
        </div>
      ) : branches.length > 1 ? (
        <Select
          id="branch"
          label="Cabang"
          value={branchId}
          onChange={(e) => {
            const nextBranch = e.target.value;
            const href = buildInventoryUrl(
              basePath,
              nextBranch,
              tab,
              tab === 'opname' ? opnameStep : undefined
            );
            router.push(href);
            router.refresh();
          }}
          options={branches.map((b) => ({ value: b.id, label: `${b.code} — ${b.name}` }))}
        />
      ) : null}

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
          value={
            isPendingApproval
              ? 'Menunggu Owner'
              : activeOpname
                ? 'Berjalan'
                : 'Tidak ada'
          }
          subtitle={
            summary.pendingApprovalCount > 0
              ? `${summary.pendingApprovalCount} menunggu persetujuan`
              : summary.lastOpnameApprovedAt
                ? `Terakhir: ${new Date(summary.lastOpnameApprovedAt).toLocaleDateString('id-ID')}`
                : undefined
          }
          icon={ClipboardCheck}
          warn={!!activeOpname || summary.pendingApprovalCount > 0}
          onClick={() => {
            setTab('opname');
            syncUrl('opname', activeOpname ? opnameStep : undefined);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Nilai Kas Seharusnya"
          value={formatCurrency(summary.expectedCash)}
          subtitle="Saldo sistem (tunai)"
          icon={Wallet}
        />
        <SummaryCard
          title="Rekonsiliasi Aktual"
          value={
            summary.actualCash != null
              ? formatCurrency(summary.actualCash)
              : activeOpname?.cashActual != null
                ? formatCurrency(activeOpname.cashActual)
                : '—'
          }
          subtitle="Kas fisik terakhir diopname"
          icon={Landmark}
        />
        <SummaryCard
          title="Selisih Kas"
          value={
            summary.cashVariance != null
              ? formatCurrency(summary.cashVariance)
              : activeOpname?.cashVariance != null
                ? formatCurrency(activeOpname.cashVariance)
                : '—'
          }
          subtitle={
            (summary.cashVariance ?? activeOpname?.cashVariance) != null
              ? (summary.cashVariance ?? activeOpname?.cashVariance) === 0
                ? 'Sesuai sistem'
                : 'Perlu penjelasan'
              : 'Belum direkonsiliasi'
          }
          icon={Wallet}
          warn={(summary.cashVariance ?? activeOpname?.cashVariance ?? 0) !== 0}
        />
        <SummaryCard
          title="Cashflow Cabang"
          value={formatCurrency(summary.expectedCash)}
          subtitle={isOwner || isManager || isCashier ? 'Lihat detail di Cashflow' : 'Nilai kas periode berjalan'}
          icon={Landmark}
          href={isOwner || isManager ? '/owner/cashflow' : isCashier ? '/cashier/cashflow' : undefined}
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
            <Button size="sm" onClick={() => setShowForm(!showForm)} disabled={!canManageMaster}>
              <Plus className="h-4 w-4" /> Tambah Item
            </Button>
          </div>

          {showForm && canManageMaster && (
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
          <CardHeader>
            <CardTitle>{isCashier ? 'Catat Masuk Stok' : 'Catat Masuk / Keluar Stok'}</CardTitle>
            {isCashier && (
              <p className="text-sm text-brand-navy/55">
                Kasir hanya mencatat stok masuk. Pengurangan stok dilakukan melalui <strong>Stock Opname</strong>.
              </p>
            )}
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Item"
              value={moveForm.itemId}
              onChange={(e) => setMoveForm({ ...moveForm, itemId: e.target.value })}
              options={[{ value: '', label: 'Pilih item...' }, ...items.map((i) => ({ value: i.id, label: i.name }))]}
            />
            {isCashier ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-navy/70">Tipe</label>
                <p className="flex h-10 items-center rounded-xl border border-brand-navy/10 bg-brand-navy/5 px-3 text-sm font-medium text-rainbow-green">
                  Masuk (IN)
                </p>
              </div>
            ) : (
              <Select
                label="Tipe"
                value={moveForm.type}
                onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value as 'IN' | 'OUT' })}
                options={[
                  { value: 'IN', label: 'Masuk (IN)' },
                  { value: 'OUT', label: 'Keluar (OUT)' },
                ]}
              />
            )}
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
                  Snapshot stok sistem → hitung fisik → rekonsiliasi kas → ajukan persetujuan owner.
                  Sesi yang belum selesai bisa dilanjutkan dari <strong>Kotak Masuk</strong>.
                </p>
                <Button className="mt-4" onClick={startOpname} disabled={opnameStarting || items.length === 0}>
                  {opnameStarting ? 'Memuat...' : 'Buat Sesi Opname Baru'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {['DRAFT', 'COUNTING'].includes(activeOpname.status) && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  Sesi opname <strong>belum selesai</strong> — Anda bisa pindah menu lain tanpa kehilangan sesi.
                  Lanjutkan kapan saja dari sini atau <strong>Kotak Masuk</strong>.
                </div>
              )}
              {activeOpname.status === 'PENDING_APPROVAL' && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Sesi opname ini <strong>menunggu persetujuan owner</strong>.
                  {isOwner
                    ? ' Anda dapat approve di sini atau di Kotak Masuk.'
                    : ' Owner akan menerima email & notifikasi untuk review.'}
                </div>
              )}
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
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-brand-navy">
                        Kas Seharusnya (Rp)
                      </label>
                      <div className="flex h-11 items-center rounded-aww-md border border-brand-navy/10 bg-brand-navy/5 px-4 font-semibold text-brand-navy">
                        {cashForm.expected.trim()
                          ? formatCurrency(cashExpectedAmount)
                          : '—'}
                      </div>
                      <p className="text-xs text-brand-navy/50">
                        Nilai tetap dari sistem (kas opname terakhir + tunai masuk − tunai keluar).
                        Setelah owner approve, opname berikutnya memakai <strong>kas aktual</strong> sebagai dasar.
                      </p>
                    </div>
                    <Input label="Kas Aktual (Rp)" type="number" value={cashForm.actual} onChange={(e) => setCashForm({ ...cashForm, actual: e.target.value })} />
                    <Input
                      label={needsVarianceNote ? 'Catatan (wajib jika ada selisih)' : 'Catatan'}
                      className="sm:col-span-2"
                      value={cashForm.notes}
                      onChange={(e) => setCashForm({ ...cashForm, notes: e.target.value })}
                      error={needsVarianceNote && !cashForm.notes.trim() ? 'Jelaskan penyebab selisih stok atau kas' : undefined}
                    />
                    {cashVariancePreview != null && (
                      <div
                        className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${
                          cashVariancePreview === 0
                            ? 'bg-green-50 text-green-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        <p>
                          Selisih kas: <strong>{formatCurrency(cashVariancePreview)}</strong>
                          {cashVariancePreview === 0
                            ? ' — kas fisik sesuai sistem.'
                            : ' — isi catatan sebelum lanjut ke review.'}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={saveCash} disabled={cashLoading || !canProceedCash}>
                        {cashLoading ? 'Menyimpan...' : 'Lanjut Review'}
                      </Button>
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
                  <CardHeader>
                    <CardTitle>
                      {isPendingApproval ? 'Menunggu Persetujuan Owner' : 'Review & Approve Opname'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isPendingApproval && !isOwner && (
                      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        Opname sudah diajukan. Owner akan review di <strong>Kotak Masuk</strong> dan menerima email notifikasi.
                      </div>
                    )}
                    {isOwner && isPendingApproval && (
                      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        Review opname dari staff. Setujui untuk menyesuaikan stok, atau <strong>Reject</strong> jika tidak sesuai.
                      </div>
                    )}
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
                    {isOwner && isPendingApproval && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button onClick={approveOpname} disabled={pending}>Approve & Sesuaikan Stok</Button>
                        <Button variant="danger" onClick={rejectOpname} disabled={pending}>Reject</Button>
                      </div>
                    )}
                    {!isPendingApproval && canSubmitOpname && (
                      <Button onClick={submitForApproval} disabled={pending}>
                        {isCashier || isManager ? 'Submit & Request Approval' : 'Ajukan Persetujuan'}
                      </Button>
                    )}
                    {isOwner && !isPendingApproval && (
                      <p className="text-xs text-brand-navy/50">
                        Sebagai owner, ajukan opname ini lalu approve dari <a href="/cashier/inbox#opname" className="text-rainbow-cyan hover:underline">Kotak Masuk</a> setelah review.
                      </p>
                    )}
                    {isPendingApproval && isOwner && (
                      <p className="text-xs text-brand-navy/50">
                        Atau review dari <a href="/cashier/inbox#opname" className="text-rainbow-cyan hover:underline">Kotak Masuk</a>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {opnames.filter(isHistoryOpname).map((o) => {
            const totalVariance = o.lines.reduce((s, l) => s + Math.abs(l.varianceCost ?? 0), 0);
            const statusLabel = historyStatusLabel(o);
            return (
              <Card
                key={o.id}
                className="cursor-pointer transition-shadow hover:shadow-aww-md"
                onClick={() => openOpnameDetail(o.id)}
              >
                <CardContent className="flex justify-between p-4">
                  <div>
                    <p className="font-semibold">{new Date(o.period).toLocaleDateString('id-ID')}</p>
                    <p className="text-sm text-brand-navy/60">{o.lines.length} item · Selisih nilai {formatCurrency(totalVariance)}</p>
                    {o.cashVariance != null && (
                      <p className="text-sm text-brand-navy/60">Selisih kas: {formatCurrency(o.cashVariance)}</p>
                    )}
                    {o.notes && statusLabel === 'REJECTED' && (
                      <p className="text-sm text-red-600/80">{o.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-rainbow-cyan">Klik untuk lihat detail</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${historyStatusStyle(statusLabel)}`}>
                    {statusLabel}
                  </span>
                </CardContent>
              </Card>
            );
          })}
          {opnames.filter(isHistoryOpname).length === 0 && (
            <p className="text-center text-brand-navy/50">Belum ada riwayat opname (disetujui / ditolak)</p>
          )}
        </div>
      )}
      <OpnameDetailModal
        opname={detailOpname}
        onClose={() => setDetailOpname(null)}
        canApprove={isOwner && detailOpname?.status === 'PENDING_APPROVAL'}
      />
      {detailLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-brand-navy/20 text-sm text-brand-navy">
          Memuat detail...
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  warn,
  href,
  onClick,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Package;
  warn?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <Card
      className={`transition-shadow ${warn ? 'border-amber-400' : ''} ${href || onClick ? 'cursor-pointer hover:shadow-aww-md' : ''}`}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-8 w-8 shrink-0 ${warn ? 'text-amber-500' : 'text-brand-orange'}`} />
        <div className="min-w-0">
          <p className="text-xs text-brand-navy/50">{title}</p>
          <p className="font-display text-lg font-bold leading-tight sm:text-xl">{value}</p>
          {subtitle && <p className="mt-0.5 truncate text-[11px] text-brand-navy/45">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
