import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InboxReviewItem {
  id: string;
  rating: number;
  note: string | null;
  createdAt: string;
  customerName: string;
  orderNumber: string;
  serviceName: string;
}

export function InboxReviews({ reviews }: { reviews: InboxReviewItem[] }) {
  if (reviews.length === 0) {
    return (
      <div className="rounded-3xl border border-brand-navy/10 bg-white/70 py-10 text-center text-brand-navy/40">
        <Star className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm">Belum ada ulasan pelanggan</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border border-brand-navy/10 bg-white p-4 shadow-aww-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-navy">{r.customerName}</p>
              <p className="font-mono text-[11px] text-brand-navy/45">{r.orderNumber}</p>
              <p className="mt-0.5 text-xs text-brand-navy/55">{r.serviceName}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < r.rating ? 'fill-rainbow-yellow text-rainbow-yellow' : 'text-brand-navy/15'
                    )}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-brand-navy/40">
                {new Date(r.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
          </div>
          {r.note ? (
            <p className="mt-3 rounded-xl bg-brand-sky/10 px-3 py-2 text-sm text-brand-navy/70">{r.note}</p>
          ) : (
            <p className="mt-2 text-xs italic text-brand-navy/35">Tanpa catatan</p>
          )}
        </div>
      ))}
    </div>
  );
}
