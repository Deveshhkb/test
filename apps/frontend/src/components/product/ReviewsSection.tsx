'use client';

import { useEffect, useState } from 'react';
import { Star, ThumbsUp } from 'lucide-react';
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
  const [photos, setPhotos] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Reviews the current user has voted "helpful" this session, and live counts.
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [helpfulCounts, setHelpfulCounts] = useState<Record<string, number>>({});

  const load = () =>
    api<{ reviews: Review[] }>(`/reviews/product/${productId}`)
      .then((d) => {
        setReviews(d.reviews);
        setHelpfulCounts(
          Object.fromEntries(d.reviews.map((r) => [r._id, r.helpfulCount || 0]))
        );
      })
      .catch(() => {});

  const voteHelpful = async (reviewId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }
    // Optimistic toggle; reconcile with the server response.
    const wasVoted = voted[reviewId];
    setVoted((v) => ({ ...v, [reviewId]: !wasVoted }));
    setHelpfulCounts((c) => ({ ...c, [reviewId]: (c[reviewId] || 0) + (wasVoted ? -1 : 1) }));
    try {
      const d = await api<{ helpful: boolean; helpfulCount: number }>(
        `/reviews/${reviewId}/helpful`,
        { method: 'POST' }
      );
      setVoted((v) => ({ ...v, [reviewId]: d.helpful }));
      setHelpfulCounts((c) => ({ ...c, [reviewId]: d.helpfulCount }));
    } catch {
      // Roll back on failure.
      setVoted((v) => ({ ...v, [reviewId]: wasVoted }));
      setHelpfulCounts((c) => ({ ...c, [reviewId]: (c[reviewId] || 0) + (wasVoted ? 1 : -1) }));
    }
  };

  useEffect(() => {
    load();
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Please select a rating.');
    setSubmitting(true);
    try {
      const photoUrls = photos
        .split(/[\n,]/)
        .map((p) => p.trim())
        .filter((p) => /^https?:\/\//.test(p));
      await api('/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId, rating, title, comment, photos: photoUrls }),
      });
      setRating(0);
      setComment('');
      setTitle('');
      setPhotos('');
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

  // Count reviews per star rating (index 0 = 5★ … index 4 = 1★) for the bars.
  const breakdown = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );

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

          {/* Rating distribution bars */}
          {reviews.length > 0 && (
            <div className="mt-5 space-y-1.5 text-left">
              {breakdown.map((count, i) => {
                const star = 5 - i;
                const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="flex w-6 shrink-0 items-center gap-0.5 text-ink/60">
                      {star} <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-6 shrink-0 text-right text-ink/40">{count}</span>
                  </div>
                );
              })}
            </div>
          )}

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
              <textarea
                value={photos}
                onChange={(e) => setPhotos(e.target.value)}
                placeholder="Photo URLs (optional, comma-separated)"
                rows={2}
                className="input text-xs"
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
                {r.photos && r.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.photos.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={src} alt="Customer photo" className="h-16 w-16 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-ink/40">
                    {r.user?.name || r.name} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => voteHelpful(r._id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                      voted[r._id]
                        ? 'border-nova-600 bg-nova-50 text-nova-600'
                        : 'border-ink/15 text-ink/60 hover:border-ink/40'
                    )}
                  >
                    <ThumbsUp className={cn('h-3.5 w-3.5', voted[r._id] && 'fill-nova-600')} />
                    Helpful{helpfulCounts[r._id] ? ` (${helpfulCounts[r._id]})` : ''}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
