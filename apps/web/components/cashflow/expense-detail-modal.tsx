'use client';

import { X, Building2, Calendar, CreditCard, ImageIcon } from 'lucide-react';
import { formatCurrency, PAYMENT_METHOD_LABELS } from '@aww/shared';
import { EXPENSE_TYPE_LABELS } from '@/lib/expense-defaults';

export type ExpenseRow = {
  id: string;
  date: string;
  dueDate: string | null;
  proofUrl: string | null;
  type: string;
  category: string;
  title: string;
  vendor: string | null;
  paymentMethod: string | null;
  amount: number;
  discount: number;
  netAmount: number;
  branchName: string;
  createdBy: string;
  description: string | null;
};

export function ExpenseDetailModal({
  expense,
  onClose,
}: {
  expense: ExpenseRow;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-aww-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-brand-navy/10 px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-brand-navy">Detail Transaksi</h2>
            <p className="text-xs text-brand-navy/50">
              {EXPENSE_TYPE_LABELS[expense.type as keyof typeof EXPENSE_TYPE_LABELS] ?? expense.type}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-brand-navy/5">
            <X className="h-5 w-5 text-brand-navy/60" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl bg-brand-sky/10 px-4 py-3">
            <p className="font-semibold text-brand-navy">{expense.title}</p>
            <p className="text-sm text-brand-navy/60">{expense.category}</p>
            <p className="mt-2 font-display text-2xl font-bold text-red-500">
              {formatCurrency(expense.netAmount)}
            </p>
            {expense.discount > 0 && (
              <p className="text-xs text-rainbow-green">
                Diskon −{formatCurrency(expense.discount)} · Harga {formatCurrency(expense.amount)}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem icon={Building2} label="Cabang" value={expense.branchName} />
            <DetailItem icon={Calendar} label="Tanggal" value={new Date(expense.date).toLocaleDateString('id-ID')} />
            {expense.dueDate && (
              <DetailItem
                icon={Calendar}
                label="Due Date"
                value={new Date(expense.dueDate).toLocaleDateString('id-ID')}
                highlight
              />
            )}
            <DetailItem
              icon={CreditCard}
              label="Metode Bayar"
              value={expense.paymentMethod ? PAYMENT_METHOD_LABELS[expense.paymentMethod] ?? expense.paymentMethod : '—'}
            />
            {expense.vendor && <DetailItem icon={Building2} label="Vendor" value={expense.vendor} />}
          </div>

          {expense.description && (
            <p className="rounded-xl bg-brand-sky/5 px-3 py-2 text-sm text-brand-navy/70">
              <span className="font-medium">Catatan:</span> {expense.description}
            </p>
          )}

          <p className="text-xs text-brand-navy/40">Dicatat oleh {expense.createdBy}</p>

          {expense.proofUrl ? (
            <div className="rounded-2xl border border-brand-navy/10 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-navy">
                <ImageIcon className="h-4 w-4 text-rainbow-cyan" /> Bukti Pembayaran
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={expense.proofUrl}
                alt="Bukti pembayaran"
                className="max-h-80 w-full rounded-xl border border-brand-navy/10 object-contain"
              />
            </div>
          ) : (
            <p className="rounded-xl bg-brand-navy/5 px-3 py-2 text-center text-sm text-brand-navy/45">
              Belum ada bukti pembayaran diunggah
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-brand-navy/8 px-3 py-2">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${highlight ? 'text-amber-600' : 'text-rainbow-cyan'}`} />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-navy/40">{label}</p>
        <p className={`text-sm font-medium ${highlight ? 'text-amber-700' : 'text-brand-navy'}`}>{value}</p>
      </div>
    </div>
  );
}
