'use client';

import { useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { submitOrderReview } from '@/app/actions/reviews';

interface ExistingReview {
  rating: number;
  note: string | null;
  createdAt: string;
}

export function OrderReviewForm({
  orderId,
  existingReview,
}: {
  orderId: string;
  existingReview?: ExistingReview | null;
}) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState(existingReview?.note ?? '');
  const [submitted, setSubmitted] = useState(!!existingReview);
  const [pending, startTransition] = useTransition();

  if (submitted && existingReview) {
    return <ReviewDisplay rating={existingReview.rating} note={existingReview.note} />;
  }

  if (submitted) {
    return (
      <ReviewDisplay rating={rating} note={note || null} message="Terima kasih atas ulasan Anda! ⭐" />
    );
  }

  function handleCancel() {
    setRating(0);
    setHover(0);
    setNote('');
  }

  function handleSubmit() {
    if (rating < 1) {
      alert('Pilih rating bintang terlebih dahulu');
      return;
    }
    startTransition(async () => {
      try {
        await submitOrderReview({ orderId, rating, note });
        setSubmitted(true);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Gagal mengirim review');
      }
    });
  }

  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-aww-sm">
      <p className="text-xs uppercase tracking-wider text-brand-navy/40">Penilaian Layanan</p>
      <p className="mt-1 text-sm text-brand-navy/60">Bagaimana pengalaman cuci Anda kali ini?</p>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1;
          const active = value <= (hover || rating);
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              className="rounded-lg p-1 transition-transform hover:scale-110"
              aria-label={`${value} bintang`}
            >
              <Star
                className={cn(
                  'h-9 w-9 transition-colors',
                  active ? 'fill-rainbow-yellow text-rainbow-yellow' : 'text-brand-navy/20'
                )}
              />
            </button>
          );
        })}
      </div>
      {rating > 0 && (
        <p className="mt-2 text-center text-sm font-medium text-brand-navy">{rating} / 5 bintang</p>
      )}

      <div className="mt-4">
        <label htmlFor="review-note" className="mb-1.5 block text-sm font-medium text-brand-navy">
          Catatan (opsional)
        </label>
        <textarea
          id="review-note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ceritakan pengalaman Anda..."
          className="w-full resize-none rounded-xl border border-brand-navy/15 bg-white px-4 py-3 text-sm text-brand-navy placeholder:text-brand-navy/35 focus:border-rainbow-cyan focus:outline-none focus:ring-2 focus:ring-rainbow-cyan/30"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={pending}>
          Batalkan
        </Button>
        <Button variant="rainbow" className="flex-1" onClick={handleSubmit} disabled={pending || rating < 1}>
          {pending ? 'Mengirim...' : 'Submit Review'}
        </Button>
      </div>
    </div>
  );
}

function ReviewDisplay({
  rating,
  note,
  message = 'Ulasan Anda',
}: {
  rating: number;
  note: string | null;
  message?: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-aww-sm">
      <p className="text-xs uppercase tracking-wider text-brand-navy/40">{message}</p>
      <div className="mt-3 flex items-center justify-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'h-7 w-7',
              i < rating ? 'fill-rainbow-yellow text-rainbow-yellow' : 'text-brand-navy/15'
            )}
          />
        ))}
      </div>
      {note && (
        <p className="mt-3 rounded-xl bg-brand-sky/10 px-4 py-3 text-sm text-brand-navy/70">{note}</p>
      )}
    </div>
  );
}
