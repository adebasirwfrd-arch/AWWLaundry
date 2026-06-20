'use client';

import { useState, useTransition } from 'react';
import { ChevronRight, AlertTriangle, X, Filter, Loader2, Wrench, RefreshCw, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateOrderStatus, reportMachineTrouble } from '@/app/actions/orders';
import { resolveMachineTrouble, type MachineResolutionType } from '@/app/actions/machine-trouble';
import { createProductionMachine, getProductionBoardData } from '@/app/actions/production-board';
import { MACHINE_TYPE_OPTIONS } from '@/lib/machine-types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_FLOW, formatCurrency, formatWeight } from '@aww/shared';
import { semantic } from '@aww/design-tokens';
import { toast } from '@/lib/toast';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  weightKg: number;
  total: number;
  customer: { name: string; phone: string };
  serviceType: { name: string };
}

interface Machine {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface WorkerBoardProps {
  orders: Order[];
  machines: Machine[];
  branches: Array<{ id: string; name: string; code?: string }>;
  showBranchFilter: boolean;
  canResolveMachines?: boolean;
  branchId: string;
  branchLabel: string;
}

const NEXT_STATUS: Record<string, string> = {
  RECEIVED: 'WASHING',
  WASHING: 'DRYING',
  DRYING: 'IRONING',
  IRONING: 'FOLDING',
  FOLDING: 'READY',
  READY: 'PICKED_UP',
};

export function WorkerBoard({
  orders: initialOrders,
  machines: initialMachines,
  branches,
  showBranchFilter,
  canResolveMachines = false,
  branchId: initialBranchId,
  branchLabel: initialBranchLabel,
}: WorkerBoardProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [machines, setMachines] = useState(initialMachines);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [branchLabel, setBranchLabel] = useState(initialBranchLabel);
  const [isPending, startTransition] = useTransition();
  const [loadingBranch, setLoadingBranch] = useState(false);
  const [reportMachine, setReportMachine] = useState<Machine | null>(null);
  const [resolveMachine, setResolveMachine] = useState<Machine | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [addingMachine, setAddingMachine] = useState(false);
  const [addMachineForm, setAddMachineForm] = useState({
    serialNumber: '',
    type: 'WASHER',
    capacityKg: '',
  });

  function changeBranch(nextBranchId: string) {
    if (nextBranchId === branchId) return;
    setLoadingBranch(true);
    startTransition(async () => {
      try {
        const data = await getProductionBoardData(nextBranchId);
        setOrders(data.orders);
        setMachines(data.machines);
        setBranchId(nextBranchId);
        setBranchLabel(data.branch.name);
        setReportMachine(null);
        setResolveMachine(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal memuat data cabang');
      } finally {
        setLoadingBranch(false);
      }
    });
  }

  function handleStatusUpdate(orderId: string, currentStatus: string) {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;

    const snapshot = orders;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: next } : o)));

    startTransition(async () => {
      try {
        await updateOrderStatus(orderId, next);
      } catch {
        setOrders(snapshot);
        toast.error('Gagal update status — dikembalikan');
      }
    });
  }

  async function submitResolve(resolution: MachineResolutionType) {
    if (!resolveMachine) return;
    setResolving(true);
    try {
      await resolveMachineTrouble(resolveMachine.id, resolution);
      setMachines((prev) =>
        prev.map((m) => (m.id === resolveMachine.id ? { ...m, status: 'IDLE' } : m))
      );
      setResolveMachine(null);
      toast.success(
        resolution === 'REPAIRED'
          ? `${resolveMachine.name} ditandai diperbaiki — aktif kembali`
          : `${resolveMachine.name} ditandai diganti — aktif kembali`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memperbarui status mesin');
    } finally {
      setResolving(false);
    }
  }

  function handleMachineClick(machine: Machine) {
    if (machine.status === 'TROUBLE' && canResolveMachines) {
      setResolveMachine(machine);
      setReportMachine(null);
      return;
    }
    if (machine.status !== 'TROUBLE') {
      setReportMachine(machine);
      setReportNote('');
      setResolveMachine(null);
    }
  }

  async function submitTroubleReport() {
    if (!reportMachine) return;
    const note = reportNote.trim();
    if (!note) {
      toast.error('Deskripsi masalah wajib diisi');
      return;
    }
    setReporting(true);
    try {
      await reportMachineTrouble(reportMachine.id, note);
      setMachines((prev) =>
        prev.map((m) => (m.id === reportMachine.id ? { ...m, status: 'TROUBLE' } : m))
      );
      setReportMachine(null);
      setReportNote('');
      toast.success('Laporan gangguan terkirim ke owner');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal melaporkan gangguan');
    } finally {
      setReporting(false);
    }
  }

  async function submitAddMachine() {
    const serial = addMachineForm.serialNumber.trim();
    if (!serial) {
      toast.error('Nomor seri mesin wajib diisi');
      return;
    }
    setAddingMachine(true);
    try {
      const created = await createProductionMachine({
        branchId,
        serialNumber: serial,
        type: addMachineForm.type,
        capacityKg: addMachineForm.capacityKg ? parseFloat(addMachineForm.capacityKg) : null,
      });
      setMachines((prev) => [
        ...prev,
        { id: created.id, name: created.name, type: created.type, status: created.status },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAddMachine(false);
      setAddMachineForm({ serialNumber: '', type: 'WASHER', capacityKg: '' });
      toast.success(`Unit ${serial} ditambahkan ke board produksi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menambah mesin');
    } finally {
      setAddingMachine(false);
    }
  }

  const columns = ORDER_STATUS_FLOW.slice(0, 6);

  return (
    <div className="space-y-6">
      {showBranchFilter ? (
        <div className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <Filter className="h-4 w-4 text-rainbow-cyan" />
            Filter Cabang
            {(loadingBranch || isPending) && <Loader2 className="h-4 w-4 animate-spin text-rainbow-cyan" />}
          </div>
          <select
            value={branchId}
            onChange={(e) => changeBranch(e.target.value)}
            disabled={loadingBranch || isPending}
            className="h-10 w-full max-w-sm rounded-xl border border-brand-navy/15 px-3 text-sm sm:w-auto sm:min-w-[240px]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-brand-navy/50">
            Menampilkan board produksi cabang <strong>{branchLabel}</strong>
          </p>
        </div>
      ) : (
        <p className="text-sm text-brand-navy/55">
          Cabang <strong>{branchLabel}</strong>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-brand-navy">Unit Mesin</h2>
        {canResolveMachines && (
          <Button
            size="sm"
            variant="rainbow"
            onClick={() => {
              setShowAddMachine(true);
              setAddMachineForm({ serialNumber: '', type: 'WASHER', capacityKg: '' });
            }}
          >
            <Plus className="h-4 w-4" /> Tambah Mesin
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {machines.map((m) => (
          <Card
            key={m.id}
            className={`cursor-pointer transition hover:shadow-aww-md ${
              m.status === 'TROUBLE' ? 'border-red-400 bg-red-50' : ''
            }`}
            onClick={() => handleMachineClick(m)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-brand-navy">{m.name}</p>
                <p className="text-xs text-brand-navy/50">{m.type}</p>
                {m.status === 'TROUBLE' && canResolveMachines && (
                  <p className="mt-1 text-[10px] font-medium text-red-600">Klik → diperbaiki / diganti</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`h-3 w-3 rounded-full ${
                    m.status === 'TROUBLE'
                      ? 'animate-pulse bg-red-500'
                      : m.status === 'RUNNING'
                        ? 'bg-rainbow-blue'
                        : 'bg-rainbow-green'
                  }`}
                />
                {m.status !== 'TROUBLE' && (
                  <AlertTriangle className="h-4 w-4 text-brand-navy/35" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-brand-navy/45">
        {canResolveMachines
          ? 'Klik mesin hijau/biru untuk lapor gangguan. Klik mesin merah untuk tandai diperbaiki atau diganti.'
          : 'Klik kartu mesin untuk melaporkan kerusakan atau masalah.'}
      </p>

      <div className="-mx-4 flex gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 snap-x snap-mandatory lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0 xl:grid-cols-6">
        {columns.map((status) => {
          const statusOrders = orders.filter((o) => o.status === status);
          const color = semantic.light.order[status.toLowerCase() as keyof typeof semantic.light.order] ?? '#ccc';

          return (
            <div key={status} className="min-w-[min(260px,82vw)] shrink-0 snap-start space-y-3 sm:min-w-[280px] lg:min-w-0">
              <div
                className="rounded-aww-md px-3 py-2 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {ORDER_STATUS_LABELS[status]} ({statusOrders.length})
              </div>

              {statusOrders.map((order) => (
                <Card key={order.id} className="transition hover:shadow-aww-md">
                  <CardContent className="p-4">
                    <p className="font-mono text-xs font-bold text-brand-navy">{order.orderNumber}</p>
                    <p className="mt-1 font-medium">{order.customer.name}</p>
                    <p className="text-xs text-brand-navy/50">
                      {formatWeight(order.weightKg)} · {order.serviceType.name}
                    </p>
                    <p className="text-sm font-semibold text-brand-orange">{formatCurrency(order.total)}</p>
                    {NEXT_STATUS[order.status] && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-3 w-full"
                        disabled={isPending}
                        onClick={() => handleStatusUpdate(order.id, order.status)}
                      >
                        → {ORDER_STATUS_LABELS[NEXT_STATUS[order.status]]}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })}
      </div>

      {showAddMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-aww-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-navy">Tambah Unit Mesin</h3>
                <p className="text-sm text-brand-navy/60">
                  Cabang <strong>{branchLabel}</strong> — nama unit mengikuti nomor seri
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMachine(false)}
                className="rounded-full p-1 text-brand-navy/45 hover:bg-brand-navy/5"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                label="Nomor Seri Mesin (nama unit)"
                value={addMachineForm.serialNumber}
                onChange={(e) => setAddMachineForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Mis: SN-WASH-2026-0042"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-navy">Tipe Mesin</label>
                <select
                  value={addMachineForm.type}
                  onChange={(e) => setAddMachineForm((f) => ({ ...f, type: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
                >
                  {MACHINE_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Kapasitas (kg, opsional)"
                type="number"
                min="0"
                step="0.1"
                value={addMachineForm.capacityKg}
                onChange={(e) => setAddMachineForm((f) => ({ ...f, capacityKg: e.target.value }))}
                placeholder="Mis: 15"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowAddMachine(false)} disabled={addingMachine}>
                Batal
              </Button>
              <Button onClick={() => void submitAddMachine()} disabled={addingMachine}>
                {addingMachine ? 'Menyimpan...' : 'Simpan Unit'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {resolveMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-aww-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-navy">Mesin Bermasalah</h3>
                <p className="text-sm text-brand-navy/60">
                  {resolveMachine.name} · {resolveMachine.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolveMachine(null)}
                className="rounded-full p-1 text-brand-navy/45 hover:bg-brand-navy/5"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-brand-navy/70">
              Tandai mesin sudah ditangani agar status kembali <strong>aktif (hijau)</strong>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="h-auto flex-col gap-2 py-4"
                onClick={() => void submitResolve('REPAIRED')}
                disabled={resolving}
              >
                <Wrench className="h-5 w-5" />
                <span>Diperbaiki</span>
              </Button>
              <Button
                variant="secondary"
                className="h-auto flex-col gap-2 py-4"
                onClick={() => void submitResolve('REPLACED')}
                disabled={resolving}
              >
                <RefreshCw className="h-5 w-5" />
                <span>Diganti</span>
              </Button>
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={() => setResolveMachine(null)} disabled={resolving}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {reportMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-aww-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-navy">Lapor Gangguan Mesin</h3>
                <p className="text-sm text-brand-navy/60">
                  {reportMachine.name} · {reportMachine.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReportMachine(null)}
                className="rounded-full p-1 text-brand-navy/45 hover:bg-brand-navy/5"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-1 block text-sm font-medium text-brand-navy/70">
              Deskripsi masalah
            </label>
            <textarea
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              rows={4}
              placeholder="Contoh: Mesin tidak berputar, ada suara aneh, kebocoran air..."
              className="w-full rounded-xl border border-brand-navy/15 px-3 py-2 text-sm"
            />
            <p className="mt-2 text-xs text-brand-navy/45">
              Laporan akan masuk ke email dan kotak masuk owner.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReportMachine(null)} disabled={reporting}>
                Batal
              </Button>
              <Button onClick={() => void submitTroubleReport()} disabled={reporting}>
                {reporting ? 'Mengirim...' : 'Kirim Laporan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
