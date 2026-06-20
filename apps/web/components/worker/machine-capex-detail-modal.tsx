'use client';

import { useEffect, useState } from 'react';
import { X, Building2, Calendar, ImageIcon, Clock } from 'lucide-react';
import { formatCurrency } from '@aww/shared';
import type { getMachineCapexDetail } from '@/app/actions/production-board';
import { Button } from '@/components/ui/button';
import {
  MACHINE_CONDITION_OPTIONS,
  type MachineCondition,
} from '@/lib/machine-condition';

type MachineCapexDetail = Awaited<ReturnType<typeof getMachineCapexDetail>>;

export function MachineCapexDetailModal({
  detail,
  loading,
  saving,
  onClose,
  onSaveCondition,
}: {
  detail: MachineCapexDetail | null;
  loading: boolean;
  saving?: boolean;
  onClose: () => void;
  onSaveCondition: (condition: MachineCondition) => void | Promise<void>;
}) {
  const [condition, setCondition] = useState<MachineCondition>('GOOD');

  useEffect(() => {
    if (detail?.currentCondition) setCondition(detail.currentCondition);
  }, [detail?.currentCondition, detail?.machine.id]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-aww-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-navy/10 px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-bold text-brand-navy">Detail Unit Mesin</h3>
            {detail && (
              <p className="text-sm text-brand-navy/60">
                {detail.machine.name} · {detail.machine.typeLabel}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-brand-navy/5">
            <X className="h-5 w-5 text-brand-navy/60" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {loading && (
            <p className="py-8 text-center text-sm text-brand-navy/50">Memuat data CAPEX...</p>
          )}

          {!loading && detail && (
            <>
              <div className="rounded-2xl bg-rainbow-green/10 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
                  <Clock className="h-4 w-4 text-rainbow-green" />
                  Lama Pemakaian
                </p>
                <p className="mt-1 font-display text-xl font-bold text-brand-navy">
                  {detail.hasCapexData ? detail.usageDuration : '—'}
                </p>
                {detail.hasCapexData && (
                  <p className="mt-1 text-xs text-brand-navy/55">
                    Sejak pembelian ({new Date(detail.purchaseDate).toLocaleDateString('id-ID')}) hingga hari ini
                  </p>
                )}
              </div>

              {!detail.hasCapexData ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Data pembelian CAPEX belum terhubung ke unit ini. Tambahkan melalui form CAPEX dengan opsi
                  &quot;Tambahkan unit ke Board Produksi&quot;.
                </p>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoItem label="Merk" value={detail.machine.brand ?? '—'} />
                    <InfoItem label="Tipe / Model" value={detail.machine.modelType ?? '—'} />
                    <InfoItem label="Nomor Seri" value={detail.machine.serialNumber} />
                    <InfoItem
                      label="Tahun Produksi"
                      value={detail.machine.productionYear ? String(detail.machine.productionYear) : '—'}
                    />
                    <InfoItem
                      label="Tahun Pembelian"
                      value={detail.machine.purchaseYear ? String(detail.machine.purchaseYear) : '—'}
                    />
                    {detail.machine.capacityKg != null && (
                      <InfoItem label="Kapasitas" value={`${detail.machine.capacityKg} kg`} />
                    )}
                  </div>

                  {detail.expense && (
                    <>
                      <div className="rounded-2xl bg-brand-sky/10 px-4 py-3">
                        <p className="font-semibold text-brand-navy">{detail.expense.title}</p>
                        <p className="text-sm text-brand-navy/60">{detail.expense.category}</p>
                        <p className="mt-2 font-display text-2xl font-bold text-red-500">
                          {formatCurrency(detail.expense.netAmount)}
                        </p>
                        {detail.expense.discount > 0 && (
                          <p className="text-xs text-rainbow-green">
                            Diskon −{formatCurrency(detail.expense.discount)} · Harga{' '}
                            {formatCurrency(detail.expense.amount)}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoItem icon={Building2} label="Cabang" value={detail.expense.branchName} />
                        <InfoItem
                          icon={Calendar}
                          label="Tanggal Pembelian"
                          value={new Date(detail.expense.date).toLocaleDateString('id-ID')}
                        />
                        {detail.expense.vendor && (
                          <InfoItem icon={Building2} label="Vendor" value={detail.expense.vendor} />
                        )}
                        {detail.expense.dueDate && (
                          <InfoItem
                            icon={Calendar}
                            label="Due Date"
                            value={new Date(detail.expense.dueDate).toLocaleDateString('id-ID')}
                            highlight
                          />
                        )}
                      </div>

                      {detail.expense.description && (
                        <p className="rounded-xl bg-brand-sky/5 px-3 py-2 text-sm text-brand-navy/70">
                          <span className="font-medium">Catatan:</span> {detail.expense.description}
                        </p>
                      )}

                      <p className="text-xs text-brand-navy/40">
                        Dicatat oleh {detail.expense.createdBy}
                      </p>

                      {detail.expense.proofUrl ? (
                        <div className="rounded-2xl border border-brand-navy/10 p-4">
                          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
                            <ImageIcon className="h-4 w-4 text-rainbow-cyan" /> Bukti Pembayaran
                          </p>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={detail.expense.proofUrl}
                            alt="Bukti pembayaran"
                            className="max-h-64 w-full rounded-xl border border-brand-navy/10 object-contain"
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              )}

              <div className="border-t border-brand-navy/10 pt-4">
                <label className="mb-1 block text-sm font-medium text-brand-navy">Kondisi Mesin</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as MachineCondition)}
                  className="h-11 w-full rounded-xl border border-brand-navy/15 px-3 text-sm"
                  disabled={saving}
                >
                  {MACHINE_CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-brand-navy/50">
                  Pilih <strong>Rusak</strong> atau <strong>Harus Diganti</strong> lalu simpan — status mesin
                  menjadi merah di semua role cabang ini. Worker juga bisa melaporkan lewat form laporan gangguan.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
                    Batal
                  </Button>
                  <Button size="sm" onClick={() => void onSaveCondition(condition)} disabled={saving}>
                    {saving ? 'Menyimpan...' : 'Simpan Kondisi'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-brand-navy/8 px-3 py-2">
      {Icon && (
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? 'text-amber-600' : 'text-rainbow-cyan'}`} />
      )}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-navy/40">{label}</p>
        <p className={`text-sm font-medium ${highlight ? 'text-amber-700' : 'text-brand-navy'}`}>{value}</p>
      </div>
    </div>
  );
}
