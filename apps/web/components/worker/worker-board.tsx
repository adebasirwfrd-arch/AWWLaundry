'use client';

import { useState, useTransition } from 'react';
import { ChevronRight, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { updateOrderStatus, reportMachineTrouble } from '@/app/actions/orders';
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
}

const NEXT_STATUS: Record<string, string> = {
  RECEIVED: 'WASHING',
  WASHING: 'DRYING',
  DRYING: 'IRONING',
  IRONING: 'FOLDING',
  FOLDING: 'READY',
  READY: 'PICKED_UP',
};

export function WorkerBoard({ orders: initialOrders, machines: initialMachines }: WorkerBoardProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [machines, setMachines] = useState(initialMachines);
  const [isPending, startTransition] = useTransition();
  const [reportMachine, setReportMachine] = useState<Machine | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reporting, setReporting] = useState(false);

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

  const columns = ORDER_STATUS_FLOW.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {machines.map((m) => (
          <Card
            key={m.id}
            className={`cursor-pointer transition hover:shadow-aww-md ${
              m.status === 'TROUBLE' ? 'border-red-400 bg-red-50' : ''
            }`}
            onClick={() => {
              if (m.status !== 'TROUBLE') {
                setReportMachine(m);
                setReportNote('');
              }
            }}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-brand-navy">{m.name}</p>
                <p className="text-xs text-brand-navy/50">{m.type}</p>
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
      <p className="text-xs text-brand-navy/45">Klik kartu mesin untuk melaporkan kerusakan atau masalah.</p>

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
