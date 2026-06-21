'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
  Area,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Filter,
  Loader2,
  Plus,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  Scale,
  Package,
  ImageIcon,
  Clock,
  Percent,
  CircleDollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCashflowData, createExpenseWithProof, deleteExpense, getExpenseCategoryOptions } from '@/app/actions/cashflow';
import { resolveMachineTypeFromCategory } from '@/lib/machine-types';
import { isBuildingCapexCategory, BUILDING_STATUS_OPTIONS } from '@/lib/capex-asset';
import { PaymentProofCapture } from '@/components/pos/payment-proof-capture';
import { ExpenseDetailModal, type ExpenseRow } from '@/components/cashflow/expense-detail-modal';
import { PERIOD_LABELS, type DashboardPeriod } from '@/lib/date-buckets';
import { formatCurrency, PAYMENT_METHOD_LABELS } from '@aww/shared';
import { palette } from '@aww/design-tokens';
import {
  CAPEX_MIN_HINT,
  EXPENSE_TYPE_LABELS,
  defaultCategories,
} from '@/lib/expense-defaults';
import type { ExpenseType } from '@aww/database';
import { useCashflowFiltersStore } from '@/stores/cashflow-filters-store';
import { toast } from '@/lib/toast';

const RAINBOW = Object.values(palette.rainbow);
const PAYMENT_OPTS = [
  { value: '', label: '— Pilih —' },
  { value: 'CASH', label: 'Tunai' },
  { value: 'BANK_TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
];

type CashflowData = Awaited<ReturnType<typeof getCashflowData>>;
type MainTab = 'income' | 'expense';
type ExpenseTab = 'CAPEX' | 'OPEX';

export function CashflowPageClient({
  initialData,
  showBranchFilter,
  defaultBranchId,
  branchLabel,
  canManageMachines = false,
}: {
  initialData: CashflowData;
  showBranchFilter: boolean;
  defaultBranchId?: string;
  branchLabel?: string;
  canManageMachines?: boolean;
}) {
  const [data, setData] = useState(initialData);
  const mainTab = useCashflowFiltersStore((s) => s.mainTab);
  const expenseTab = useCashflowFiltersStore((s) => s.expenseTab);
  const period = useCashflowFiltersStore((s) => s.period);
  const storedBranchId = useCashflowFiltersStore((s) => s.branchId);
  const setMainTab = useCashflowFiltersStore((s) => s.setMainTab);
  const setExpenseTab = useCashflowFiltersStore((s) => s.setExpenseTab);
  const setPeriod = useCashflowFiltersStore((s) => s.setPeriod);
  const setBranchId = useCashflowFiltersStore((s) => s.setBranchId);
  const lockedBranchId = !showBranchFilter ? defaultBranchId : undefined;
  const branchId = lockedBranchId || storedBranchId || defaultBranchId || '';

  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<string[]>([...defaultCategories('CAPEX')]);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);

  const [form, setForm] = useState({
    branchId: defaultBranchId ?? data.branches[0]?.id ?? '',
    category: '',
    customCategory: '',
    title: '',
    vendor: '',
    paymentMethod: '',
    amount: '',
    discount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    dueDate: '',
    addToProductionBoard: true,
    machineSerialNumber: '',
    machineCapacityKg: '',
    assetBrand: '',
    assetModelType: '',
    assetProductionYear: '',
    assetPurchaseYear: '',
    propertyAddress: '',
    propertyOwnerContact: '',
    buildingStatus: '',
  });

  useEffect(() => {
    if (lockedBranchId) setBranchId(lockedBranchId);
  }, [lockedBranchId, setBranchId]);

  useEffect(() => {
    const applyPersisted = () => {
      const { period: p, branchId: b } = useCashflowFiltersStore.getState();
      const resolvedBranch = lockedBranchId || b || undefined;
      if (p !== 'month' || resolvedBranch) reloadAsync(p, resolvedBranch);
    };
    if (useCashflowFiltersStore.persist.hasHydrated()) applyPersisted();
    else return useCashflowFiltersStore.persist.onFinishHydration(applyPersisted);
  }, [lockedBranchId]);

  async function reloadAsync(p?: DashboardPeriod, b?: string) {
    const resolvedBranch = lockedBranchId || (b ?? branchId) || undefined;
    const result = await getCashflowData({
      period: p ?? period,
      branchId: resolvedBranch,
    });
    setData(result);
    return result;
  }

  function reload(p?: DashboardPeriod, b?: string) {
    startTransition(async () => {
      await reloadAsync(p, b);
    });
  }

  function loadCategories(type: ExpenseTab) {
    getExpenseCategoryOptions(type, form.branchId || branchId || undefined).then(setCategories);
  }

  function openExpenseForm(type: ExpenseTab) {
    setExpenseTab(type);
    setShowForm(true);
    setFormError(null);
    setForm((f) => ({
      ...f,
      branchId: branchId || f.branchId || (data.branches[0]?.id ?? ''),
      category: '',
      customCategory: '',
      title: '',
      vendor: '',
      paymentMethod: '',
      amount: '',
      discount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      dueDate: '',
      addToProductionBoard: true,
      machineSerialNumber: '',
      machineCapacityKg: '',
      assetBrand: '',
      assetModelType: '',
      assetProductionYear: '',
      assetPurchaseYear: '',
      propertyAddress: '',
      propertyOwnerContact: '',
      buildingStatus: '',
    }));
    setProofUrl(null);
    setProofPreview(null);
    loadCategories(type);
  }

  function handleProofChange(url: string | null, preview: string | null) {
    setProofUrl(url);
    setProofPreview(preview);
  }

  async function submitExpense() {
    const category = form.customCategory.trim() || form.category.trim() || form.title.trim();
    const amount = parseFloat(form.amount);
    const discount = parseFloat(form.discount) || 0;

    if (!form.branchId) {
      setFormError('Pilih cabang terlebih dahulu');
      return;
    }
    if (!category) {
      setFormError('Isi kategori, kategori baru, atau judul/deskripsi');
      return;
    }
    if (!amount || amount <= 0) {
      setFormError('Harga harus diisi dan lebih dari 0');
      return;
    }
    const needsProof =
      form.paymentMethod === 'BANK_TRANSFER' || form.paymentMethod === 'QRIS';
    if (proofPreview && !proofUrl) {
      setFormError('Tunggu upload bukti bayar selesai');
      return;
    }
    if (needsProof && !proofUrl) {
      setFormError('Upload bukti bayar wajib untuk Transfer / QRIS — tunggu hingga selesai');
      return;
    }

    const machineType =
      expenseTab === 'CAPEX' ? resolveMachineTypeFromCategory(category) : null;
    const buildingCapex = expenseTab === 'CAPEX' && isBuildingCapexCategory(category);

    if (machineType) {
      if (!form.assetBrand.trim()) {
        setFormError('Merk mesin wajib diisi');
        return;
      }
      if (!form.assetModelType.trim()) {
        setFormError('Tipe mesin wajib diisi');
        return;
      }
      if (!form.machineSerialNumber.trim()) {
        setFormError('Nomor seri mesin wajib diisi');
        return;
      }
      if (!form.assetProductionYear.trim()) {
        setFormError('Tahun produksi wajib diisi');
        return;
      }
      if (!form.assetPurchaseYear.trim()) {
        setFormError('Tahun pembelian wajib diisi');
        return;
      }
      if (!form.vendor.trim()) {
        setFormError('Vendor wajib diisi untuk CAPEX mesin');
        return;
      }
    }

    if (buildingCapex) {
      if (!form.propertyAddress.trim()) {
        setFormError('Alamat ruko wajib diisi');
        return;
      }
      if (!form.propertyOwnerContact.trim()) {
        setFormError('No. kontak pemilik ruko wajib diisi');
        return;
      }
      if (!form.buildingStatus) {
        setFormError('Status bangunan (sewa/beli) wajib dipilih');
        return;
      }
    }

    setFormError(null);
    setMessage(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('branchId', form.branchId);
      fd.append('type', expenseTab);
      fd.append('category', category);
      fd.append('title', form.title.trim() || category);
      if (form.vendor) fd.append('vendor', form.vendor);
      if (form.paymentMethod) fd.append('paymentMethod', form.paymentMethod);
      fd.append('amount', String(amount));
      fd.append('discount', String(discount));
      if (form.description) fd.append('description', form.description);
      fd.append('date', form.date);
      if (expenseTab === 'CAPEX' && form.dueDate) fd.append('dueDate', form.dueDate);
      if (proofUrl) fd.append('proofUrl', proofUrl);
      if (machineType) {
        fd.append('assetBrand', form.assetBrand.trim());
        fd.append('assetModelType', form.assetModelType.trim());
        fd.append('assetSerialNumber', form.machineSerialNumber.trim());
        fd.append('assetProductionYear', form.assetProductionYear.trim());
        fd.append('assetPurchaseYear', form.assetPurchaseYear.trim());
        if (form.machineCapacityKg) fd.append('machineCapacityKg', form.machineCapacityKg);
        if (canManageMachines) {
          fd.append('addToProductionBoard', form.addToProductionBoard ? 'true' : 'false');
        }
      }
      if (buildingCapex) {
        fd.append('propertyAddress', form.propertyAddress.trim());
        fd.append('propertyOwnerContact', form.propertyOwnerContact.trim());
        fd.append('buildingStatus', form.buildingStatus);
      }

      const result = await createExpenseWithProof(fd);

      setShowForm(false);
      setProofUrl(null);
      setProofPreview(null);
      setMessage(
        canManageMachines && expenseTab === 'CAPEX' && form.addToProductionBoard && machineType
          ? 'Pengeluaran tersimpan & unit mesin ditambahkan ke board produksi'
          : 'Pengeluaran tersimpan'
      );
      setSelectedExpense(result.expense as ExpenseRow);
      void reloadAsync();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan';
      setFormError(msg);
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  function removeExpense(id: string) {
    if (!confirm('Hapus pengeluaran ini?')) return;
    startTransition(async () => {
      try {
        await deleteExpense(id);
        reload();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Gagal menghapus');
      }
    });
  }

  const { summary, realizedPnl } = data;
  const filteredExpenses = data.expenseTable.filter((e) => e.type === expenseTab);

  return (
    <div className="space-y-6">
      {/* Summary cards — 2 baris agar tidak overflow */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={ArrowUpCircle} label="Pemasukan" value={summary.totalIncome} color="text-rainbow-green" />
        <SummaryCard icon={ArrowDownCircle} label="Pengeluaran" value={summary.totalExpense} color="text-red-500" />
        <SummaryCard icon={Wallet} label="Net Cashflow" value={summary.netCashflow} color={summary.netCashflow >= 0 ? 'text-rainbow-cyan' : 'text-red-500'} />
        <SummaryCard icon={Wallet} label="Nilai Kas" value={summary.expectedCash} color="text-brand-navy" subtitle="Saldo tunai sistem" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Scale}
          label="Rekonsiliasi Aktual"
          value={summary.actualCash ?? 0}
          color="text-rainbow-cyan"
          subtitle={summary.actualCash == null ? 'Belum diopname' : 'Kas fisik terakhir'}
          muted={summary.actualCash == null}
        />
        <SummaryCard
          icon={TrendingDown}
          label="Selisih Kas"
          value={summary.cashVariance ?? 0}
          color={(summary.cashVariance ?? 0) === 0 ? 'text-rainbow-green' : 'text-amber-600'}
          subtitle={(summary.cashVariance ?? 0) === 0 ? 'Sesuai' : 'Perlu review'}
          muted={summary.cashVariance == null}
        />
        <SummaryCard icon={Building2} label="CAPEX" value={summary.totalCapex} color="text-rainbow-purple" />
        <SummaryCard icon={TrendingDown} label="OPEX" value={summary.totalOpex} color="text-brand-orange" />
      </div>

      {/* Realized PnL */}
      <div className="rounded-2xl border border-brand-navy/10 bg-gradient-to-br from-brand-sky/10 via-white to-rainbow-green/5 p-5 shadow-aww-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-brand-navy">Realized PnL</h2>
            <p className="text-sm text-brand-navy/55">
              Uang real tercatat vs piutang belum terbayar (Bayar Nanti & sisa DP) — {PERIOD_LABELS[period]}
            </p>
          </div>
          <div className="rounded-full bg-brand-navy/5 px-3 py-1.5 text-sm font-semibold text-brand-navy">
            Realisasi {realizedPnl.realizationRate}%
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={CircleDollarSign}
            label="Realized (Tercatat)"
            value={realizedPnl.realizedIncome}
            color="text-rainbow-green"
            subtitle="Uang sudah diterima"
          />
          <SummaryCard
            icon={Clock}
            label="Unrealized (Piutang)"
            value={realizedPnl.unrealizedIncome}
            color="text-brand-orange"
            subtitle="Belum terbayar dari order periode"
          />
          <SummaryCard
            icon={Wallet}
            label="Realized PnL"
            value={realizedPnl.realizedPnl}
            color={realizedPnl.realizedPnl >= 0 ? 'text-rainbow-cyan' : 'text-red-500'}
            subtitle="Tercatat − pengeluaran"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Nilai Order"
            value={realizedPnl.bookedOrderValue}
            color="text-brand-navy"
            subtitle={`Terbayar ${formatCurrency(realizedPnl.collectedOnPeriodOrders)}`}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MiniKpi icon={Clock} label="Piutang Bayar Nanti" value={formatCurrency(realizedPnl.payLaterOutstanding)} />
          <MiniKpi icon={Percent} label="Piutang Sisa DP" value={formatCurrency(realizedPnl.dpOutstanding)} />
          <MiniKpi icon={TrendingDown} label="Piutang Lainnya" value={formatCurrency(realizedPnl.otherOutstanding)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard title="Tren Realized vs Unrealized (Harian)">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={realizedPnl.daily}>
                <defs>
                  <linearGradient id="realizedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette.rainbow.green} stopOpacity={0.45} />
                    <stop offset="95%" stopColor={palette.rainbow.green} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="unrealizedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette.brand.orange} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={palette.brand.orange} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number, name: string) => formatCurrency(v)} />
                <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="realizedIncome"
                  fill="url(#realizedGrad)"
                  stroke={palette.rainbow.green}
                  name="Realized"
                />
                <Area
                  type="monotone"
                  dataKey="unrealizedIncome"
                  fill="url(#unrealizedGrad)"
                  stroke={palette.brand.orange}
                  name="Unrealized"
                />
                <Line
                  type="monotone"
                  dataKey="realizedPnl"
                  stroke={palette.rainbow.cyan}
                  strokeWidth={2.5}
                  dot={false}
                  name="Realized PnL"
                />
                <Legend />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Realized vs Piutang (Breakdown)">
            {realizedPnl.waterfall.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={realizedPnl.waterfall}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="realized" stackId="a" fill={palette.rainbow.green} radius={[4, 4, 0, 0]} name="Realized" />
                  <Bar dataKey="unrealized" stackId="a" fill={palette.brand.orange} radius={[4, 4, 0, 0]} name="Unrealized" />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-10 text-center text-sm text-brand-navy/45">Belum ada data order pada periode ini.</p>
            )}
          </ChartCard>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
          <Filter className="h-4 w-4 text-rainbow-cyan" />
          Filter
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
        {showBranchFilter ? (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">Cabang</label>
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); reload(undefined, e.target.value); }}
              className="h-10 min-w-[180px] rounded-xl border border-brand-navy/15 px-3 text-sm"
            >
              <option value="">Semua Cabang</option>
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        ) : branchLabel ? (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">Cabang</label>
            <p className="flex h-10 min-w-[180px] items-center rounded-xl border border-brand-navy/10 bg-brand-navy/5 px-3 text-sm font-medium text-brand-navy">
              {branchLabel}
            </p>
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">Periode</label>
          <select
            value={period}
            onChange={(e) => { const p = e.target.value as DashboardPeriod; setPeriod(p); reload(p); }}
            className="h-10 min-w-[140px] rounded-xl border border-brand-navy/15 px-3 text-sm"
          >
            {(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map((k) => (
              <option key={k} value={k}>{PERIOD_LABELS[k]}</option>
            ))}
          </select>
        </div>
        {branchId && (
          <p className="ml-auto text-xs text-brand-navy/45">
            Nilai kas untuk cabang terpilih
          </p>
        )}
        {!branchId && showBranchFilter && (
          <p className="ml-auto text-xs text-brand-navy/45">
            Nilai kas = total semua cabang
          </p>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex gap-2 rounded-2xl border border-brand-navy/10 bg-white p-2 shadow-aww-sm">
        {([
          { id: 'income' as const, label: 'Pemasukan', icon: TrendingUp },
          { id: 'expense' as const, label: 'Pengeluaran', icon: TrendingDown },
        ]).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setMainTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                mainTab === t.id ? 'bg-aww-rainbow text-white shadow-aww-glow-rainbow' : 'text-brand-navy/60 hover:bg-brand-sky/10'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-2 text-sm ${
          message.includes('Gagal') || message.includes('wajib') || message.includes('Lengkapi') || message.includes('Isi ')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-rainbow-green/10 text-rainbow-green border border-rainbow-green/20'
        }`}>{message}</div>
      )}

      {mainTab === 'income' && (
        <IncomeSection data={data} period={period} />
      )}

      {mainTab === 'expense' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(['CAPEX', 'OPEX'] as ExpenseTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setExpenseTab(t); setShowForm(false); }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    expenseTab === t ? 'bg-brand-navy text-white' : 'bg-brand-sky/10 text-brand-navy/70 hover:bg-brand-sky/20'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <Button variant="rainbow" size="sm" onClick={() => openExpenseForm(expenseTab)}>
              <Plus className="h-4 w-4" /> Tambah {expenseTab}
            </Button>
          </div>

          {expenseTab === 'CAPEX' && (
            <p className="text-xs text-brand-navy/50">
              CAPEX = pengeluaran modal besar (≥ {formatCurrency(CAPEX_MIN_HINT)}): sewa ruko, mesin cuci, pengering, setrika, dll.
            </p>
          )}

          {showForm && (
            <ExpenseForm
              type={expenseTab}
              form={form}
              setForm={setForm}
              categories={categories}
              branches={data.branches}
              showBranchPicker={showBranchFilter}
              canManageMachines={canManageMachines}
              pending={saving}
              formError={formError}
              proofPreview={proofPreview}
              proofUrl={proofUrl}
              onProofChange={handleProofChange}
              onCancel={() => setShowForm(false)}
              onSubmit={submitExpense}
            />
          )}

          {selectedExpense && (
            <ExpenseDetailModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} />
          )}

          <ExpenseCharts data={data} type={expenseTab} />

          <div className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-aww-sm">
            <div className="border-b border-brand-navy/10 px-4 py-3">
              <h3 className="font-semibold text-brand-navy">Daftar {expenseTab} — {PERIOD_LABELS[period]}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-brand-navy/8 bg-brand-sky/5 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                    <th className="px-4 py-2">Tanggal</th>
                    {expenseTab === 'CAPEX' && <th className="px-4 py-2">Due Date</th>}
                    <th className="px-4 py-2">Cabang</th>
                    <th className="px-4 py-2">Kategori</th>
                    <th className="px-4 py-2">Judul</th>
                    <th className="px-4 py-2">Vendor</th>
                    <th className="px-4 py-2">Bayar</th>
                    <th className="px-4 py-2">Harga</th>
                    <th className="px-4 py-2">Diskon</th>
                    <th className="px-4 py-2">Net</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan={expenseTab === 'CAPEX' ? 11 : 10} className="px-4 py-10 text-center text-brand-navy/40">Belum ada data {expenseTab}</td></tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr
                        key={e.id}
                        className="cursor-pointer border-b border-brand-navy/5 hover:bg-brand-sky/5"
                        onClick={() => setSelectedExpense(e as ExpenseRow)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(e.date).toLocaleDateString('id-ID')}</td>
                        {expenseTab === 'CAPEX' && (
                          <td className="px-4 py-2 whitespace-nowrap">
                            {e.dueDate ? (
                              <span className="font-medium text-amber-700">
                                {new Date(e.dueDate).toLocaleDateString('id-ID')}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2">{e.branchName}</td>
                        <td className="px-4 py-2">{e.category}</td>
                        <td className="px-4 py-2 font-medium">{e.title}</td>
                        <td className="px-4 py-2">{e.vendor ?? '—'}</td>
                        <td className="px-4 py-2">{e.paymentMethod ? PAYMENT_METHOD_LABELS[e.paymentMethod] : '—'}</td>
                        <td className="px-4 py-2">{formatCurrency(e.amount)}</td>
                        <td className="px-4 py-2 text-rainbow-green">{e.discount > 0 ? `−${formatCurrency(e.discount)}` : '—'}</td>
                        <td className="px-4 py-2 font-semibold text-red-500">{formatCurrency(e.netAmount)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {e.proofUrl && (
                              <span title="Ada bukti bayar">
                                <ImageIcon className="h-4 w-4 text-rainbow-cyan" />
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                removeExpense(e.id);
                              }}
                              className="text-red-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  subtitle?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-brand-navy/50">{label}</p>
          <p className={`font-display text-base font-bold leading-tight sm:text-lg ${color} break-words`}>
            {muted ? '—' : formatCurrency(value)}
          </p>
          {subtitle && <p className="mt-0.5 line-clamp-2 text-[11px] text-brand-navy/45">{subtitle}</p>}
        </div>
        <Icon className={`h-7 w-7 shrink-0 ${color} opacity-70`} />
      </div>
    </div>
  );
}

function IncomeSection({ data, period }: { data: CashflowData; period: DashboardPeriod }) {
  const { summary } = data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniKpi icon={Package} label="Jumlah Cucian" value={`${summary.orderCount} order`} />
        <MiniKpi icon={Scale} label="Total Berat" value={`${summary.totalWeight.toFixed(1)} kg`} />
        <MiniKpi icon={Wallet} label="Transaksi" value={`${summary.paymentCount}x`} />
        <MiniKpi icon={TrendingUp} label="Rata-rata/order" value={formatCurrency(summary.avgOrderValue)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Pemasukan vs Pengeluaran (harian)">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="income" fill={palette.rainbow.green} name="Pemasukan" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill={palette.brand.orange} name="Pengeluaran" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="net" stroke={palette.rainbow.cyan} strokeWidth={2} name="Net" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Metode Pembayaran">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.paymentMethods} dataKey="amount" nameKey="method" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}
                label={({ method, percent }) => `${PAYMENT_METHOD_LABELS[method as string] ?? method} ${(percent * 100).toFixed(0)}%`}>
                {data.paymentMethods.map((_, i) => (
                  <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {data.incomeByBranch.length > 1 && (
        <ChartCard title="Pemasukan per Cabang">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.incomeByBranch} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="branchName" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="amount" fill={palette.rainbow.cyan} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Heatmap */}
      {data.heatmap.length > 0 && data.heatmap[0].cells.length > 0 && (
        <ChartCard title="Heatmap Pemasukan — Cabang × Hari">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-brand-navy/50">Hari</th>
                  {data.heatmap[0].cells.map((c) => (
                    <th key={c.branchId} className="p-2 text-center text-brand-navy/50">{c.branchName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.heatmap.map((row) => (
                  <tr key={row.date}>
                    <td className="p-2 font-medium text-brand-navy/70">{row.date}</td>
                    {row.cells.map((cell) => {
                      const intensity = cell.amount / data.maxHeat;
                      return (
                        <td key={cell.branchId} className="p-1">
                          <div
                            className="rounded-lg px-2 py-3 text-center font-semibold"
                            style={{
                              backgroundColor: `rgba(0, 194, 224, ${0.1 + intensity * 0.85})`,
                              color: intensity > 0.5 ? '#fff' : '#1B2B4B',
                            }}
                            title={formatCurrency(cell.amount)}
                          >
                            {cell.amount > 0 ? `${Math.round(cell.amount / 1000)}k` : '—'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      <div className="overflow-hidden rounded-2xl border border-brand-navy/10 bg-white shadow-aww-sm">
        <div className="border-b border-brand-navy/10 px-4 py-3">
          <h3 className="font-semibold text-brand-navy">Tabel Pemasukan — {PERIOD_LABELS[period]}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-brand-navy/8 bg-brand-sky/5 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-navy/45">
                <th className="px-4 py-2">Waktu</th>
                <th className="px-4 py-2">Cabang</th>
                <th className="px-4 py-2">No. Order</th>
                <th className="px-4 py-2">Pelanggan</th>
                <th className="px-4 py-2">Layanan</th>
                <th className="px-4 py-2">Berat</th>
                <th className="px-4 py-2">Metode</th>
                <th className="px-4 py-2">Jumlah</th>
                <th className="px-4 py-2">Kasir</th>
              </tr>
            </thead>
            <tbody>
              {data.incomeTable.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-brand-navy/40">Belum ada pemasukan</td></tr>
              ) : (
                data.incomeTable.map((r) => (
                  <tr key={r.id} className="border-b border-brand-navy/5">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(r.paidAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-4 py-2">{r.branchName}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.orderNumber}</td>
                    <td className="px-4 py-2">{r.customerName}</td>
                    <td className="px-4 py-2">{r.serviceName}</td>
                    <td className="px-4 py-2">{r.weightKg > 0 ? `${r.weightKg} kg` : '—'}</td>
                    <td className="px-4 py-2">{PAYMENT_METHOD_LABELS[r.method] ?? r.method}</td>
                    <td className="px-4 py-2 font-semibold text-rainbow-green">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-2 text-xs text-brand-navy/50">{r.receivedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ExpenseCharts({ data, type }: { data: CashflowData; type: ExpenseTab }) {
  const donut = data.expenseDonut.filter((e) => e.type === type);
  const capexOpex = data.capexOpexSplit;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title={`Breakdown ${type} per Kategori`}>
        {donut.length === 0 ? (
          <p className="py-12 text-center text-sm text-brand-navy/40">Belum ada data</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="category" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                {donut.map((_, i) => (
                  <Cell key={i} fill={RAINBOW[i % RAINBOW.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="CAPEX vs OPEX">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={capexOpex} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
              label={({ name, value }) => `${name}: ${formatCurrency(value)}`}>
              <Cell fill={palette.rainbow.purple} />
              <Cell fill={palette.brand.orange} />
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-aww-sm">
      <h3 className="mb-4 font-semibold text-brand-navy">{title}</h3>
      {children}
    </div>
  );
}

function MiniKpi({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-rainbow-cyan" />
        <div>
          <p className="text-xs text-brand-navy/50">{label}</p>
          <p className="font-semibold text-brand-navy">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ExpenseForm({
  type,
  form,
  setForm,
  categories,
  branches,
  showBranchPicker,
  canManageMachines = false,
  pending,
  formError,
  proofPreview,
  proofUrl,
  onProofChange,
  onCancel,
  onSubmit,
}: {
  type: ExpenseType;
  form: {
    branchId: string;
    category: string;
    customCategory: string;
    title: string;
    vendor: string;
    paymentMethod: string;
    amount: string;
    discount: string;
    description: string;
    date: string;
    dueDate: string;
    addToProductionBoard: boolean;
    machineSerialNumber: string;
    machineCapacityKg: string;
    assetBrand: string;
    assetModelType: string;
    assetProductionYear: string;
    assetPurchaseYear: string;
    propertyAddress: string;
    propertyOwnerContact: string;
    buildingStatus: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  categories: string[];
  branches: Array<{ id: string; name: string }>;
  showBranchPicker: boolean;
  canManageMachines?: boolean;
  pending: boolean;
  formError: string | null;
  proofPreview: string | null;
  proofUrl: string | null;
  onProofChange: (proofUrl: string | null, preview: string | null) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const net = Math.max(0, (parseFloat(form.amount) || 0) - (parseFloat(form.discount) || 0));
  const proofRequired =
    form.paymentMethod === 'BANK_TRANSFER' || form.paymentMethod === 'QRIS';
  const resolvedCategory = form.customCategory.trim() || form.category.trim() || form.title.trim();
  const machineType = type === 'CAPEX' ? resolveMachineTypeFromCategory(resolvedCategory) : null;
  const buildingCapex = type === 'CAPEX' && isBuildingCapexCategory(resolvedCategory);
  const showMachineFields = type === 'CAPEX' && !!machineType;

  return (
    <div className="rounded-2xl border border-rainbow-cyan/30 bg-brand-sky/5 p-5">
      <h3 className="font-semibold text-brand-navy">{EXPENSE_TYPE_LABELS[type]}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showBranchPicker && (
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-navy">Cabang</label>
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="h-11 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">Kategori</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-11 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
          >
            <option value="">— Pilih / baru di bawah —</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Input label="Kategori Baru (opsional)" value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} placeholder="Mis: AC Split" />
        <Input label="Judul / Deskripsi Singkat" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mis: Sewa ruko 6 bulan" />
        <Input label="Vendor / Supplier" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <div>
          <label className="mb-1 block text-sm font-medium text-brand-navy">Metode Pembayaran</label>
          <select
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            className="h-11 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
          >
            {PAYMENT_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <Input label="Tanggal" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        {type === 'CAPEX' && (
          <div>
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              min={form.date}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
            <p className="mt-1 text-[11px] text-brand-navy/45">
              Email pengingat ke owner via Brevo: 3 bulan & 1 bulan sebelum jatuh tempo
            </p>
          </div>
        )}
        <Input label="Harga (Rp)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <Input label="Diskon (Rp)" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        <div className="flex items-end">
          <div className="rounded-xl bg-white px-4 py-3">
            <p className="text-xs text-brand-navy/50">Total bersih</p>
            <p className="font-display text-xl font-bold text-red-500">{formatCurrency(net)}</p>
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Input label="Catatan tambahan" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        {showMachineFields && (
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-rainbow-blue/25 bg-rainbow-blue/5 p-4">
            <p className="text-sm font-semibold text-brand-navy">Detail Mesin ({machineType})</p>
            <p className="mt-0.5 text-xs text-brand-navy/55">
              Wajib diisi untuk CAPEX mesin cuci, pengering, atau setrika uap.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Merk"
                value={form.assetBrand}
                onChange={(e) => setForm({ ...form, assetBrand: e.target.value })}
                placeholder="Mis: LG, Samsung, Electrolux"
              />
              <Input
                label="Tipe / Model"
                value={form.assetModelType}
                onChange={(e) => setForm({ ...form, assetModelType: e.target.value })}
                placeholder="Mis: Front Load 15kg"
              />
              <Input
                label="Nomor Seri"
                value={form.machineSerialNumber}
                onChange={(e) => setForm({ ...form, machineSerialNumber: e.target.value })}
                placeholder="Mis: SN-WASH-2026-0042"
              />
              <Input
                label="Tahun Produksi"
                type="number"
                min="1990"
                max={String(new Date().getFullYear())}
                value={form.assetProductionYear}
                onChange={(e) => setForm({ ...form, assetProductionYear: e.target.value })}
                placeholder="Mis: 2024"
              />
              <Input
                label="Tahun Pembelian"
                type="number"
                min="1990"
                max={String(new Date().getFullYear() + 1)}
                value={form.assetPurchaseYear}
                onChange={(e) => setForm({ ...form, assetPurchaseYear: e.target.value })}
                placeholder="Mis: 2025"
              />
              <Input
                label="Kapasitas (kg, opsional)"
                type="number"
                min="0"
                step="0.1"
                value={form.machineCapacityKg}
                onChange={(e) => setForm({ ...form, machineCapacityKg: e.target.value })}
                placeholder="Mis: 15"
              />
            </div>
            {canManageMachines && (
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={form.addToProductionBoard}
                  onChange={(e) => setForm({ ...form, addToProductionBoard: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-brand-navy/20"
                />
                <span>
                  <span className="block text-sm font-semibold text-brand-navy">
                    Tambahkan unit ke Board Produksi
                  </span>
                  <span className="mt-0.5 block text-xs text-brand-navy/55">
                    Unit akan muncul di board produksi cabang yang dipilih dengan nomor seri sebagai nama unit.
                  </span>
                </span>
              </label>
            )}
          </div>
        )}
        {buildingCapex && (
          <div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-rainbow-orange/25 bg-rainbow-orange/5 p-4">
            <p className="text-sm font-semibold text-brand-navy">Detail Ruko / Bangunan</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="Alamat Ruko"
                  value={form.propertyAddress}
                  onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  placeholder="Jl. ..., No. ..., Kota"
                />
              </div>
              <Input
                label="No. Kontak Pemilik Ruko"
                value={form.propertyOwnerContact}
                onChange={(e) => setForm({ ...form, propertyOwnerContact: e.target.value })}
                placeholder="Mis: 0812xxxxxxx"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-navy">Status Bangunan</label>
                <select
                  value={form.buildingStatus}
                  onChange={(e) => setForm({ ...form, buildingStatus: e.target.value })}
                  className="h-11 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
                >
                  <option value="">— Pilih —</option>
                  {BUILDING_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        <div className="sm:col-span-2 lg:col-span-3">
          <PaymentProofCapture
            required={proofRequired}
            category="expense-proof"
            proofPreview={proofPreview}
            proofUrl={proofUrl}
            onProofChange={onProofChange}
            title="Bukti Bayar"
            hint="Foto bukti transfer, QRIS, atau kwitansi — diupload per batch otomatis (tanpa batas ukuran)"
          />
        </div>
      </div>
      {formError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {formError}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="rainbow" size="sm" disabled={pending || (!!proofPreview && !proofUrl)} onClick={onSubmit}>
          {pending ? 'Menyimpan...' : 'Simpan Pengeluaran'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Batal</Button>
      </div>
    </div>
  );
}
