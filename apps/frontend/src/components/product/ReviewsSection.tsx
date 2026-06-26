'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import type { Review } from '@/lib/types';

export default function ReviewsSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    api<{ reviews: Review[] }>(`/reviews/product/${productId}`)
      .then((d) => setReviews(d.reviews))
      .catch(() => {});

  useEffect(() => {
    load();
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Please select a rating.');
    setSubmitting(true);
    try {
      await api('/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId, rating, title, comment }),
      });
      setRating(0);
      setComment('');
      setTitle('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <section className="mt-14 border-t border-ink/10 pt-10">
      <h2 className="text-2xl font-black">Ratings & Reviews</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl bg-nova-50 p-6 text-center">
          <p className="text-5xl font-black">{avg.toFixed(1)}</p>
          <div className="mt-2 flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn('h-5 w-5', i < Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-ink/15')} />
            ))}
          </div>
          <p className="mt-1 text-sm text-ink/50">{reviews.length} reviews</p>

          {user && (
            <form onSubmit={submit} className="mt-6 space-y-3 text-left">
              <p className="text-sm font-semibold">Write a review</p>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    onMouseEnter={() => setHover(i + 1)}
                    onMouseLeave={() => setHover(0)}
                  >
                    <Star className={cn('h-6 w-6', i < (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-ink/20')} />
                  </button>
                ))}
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                className="input !py-2"
              />
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="input"
              />
              {error && <p className="text-xs text-accent">{error}</p>}
              <button disabled={submitting} className="btn-primary w-full !py-2.5">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-5">
          {reviews.length === 0 ? (
            <p className="text-sm text-ink/50">No reviews yet. Be the first to review this product!</p>
          ) : (
            reviews.map((r) => (
              <div key={r._id} className="border-b border-ink/10 pb-5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                    {r.rating} <Star className="h-2.5 w-2.5 fill-white" />
                  </span>
                  <span className="font-semibold">{r.title || r.name}</span>
                  {r.verifiedPurchase && (
                    <span className="text-xs text-green-600">✓ Verified</span>
                  )}
                </div>
                {r.comment && <p className="mt-2 text-sm text-ink/70">{r.comment}</p>}
                <p className="mt-2 text-xs text-ink/40">
                  {r.user?.name || r.name} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
