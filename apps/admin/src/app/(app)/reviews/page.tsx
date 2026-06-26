'use client';

import { useEffect, useState } from 'react';
import { Star, Check, X, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import PageHeader from '@/components/PageHeader';

interface Review {
  _id: string;
  rating: number;
  title?: string;
  comment?: string;
  status: string;
  createdAt: string;
  user?: { name: string };
  product?: { title: string };
}

export default function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [filter, setFilter] = useState('');

  const load = () =>
    api<{ reviews: Review[] }>(`/reviews/admin/all${filter ? `?status=${filter}` : ''}`)
      .then((d) => setItems(d.reviews))
      .catch(() => {});

  useEffect(() => {
    load();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const moderate = async (id: string, status: string) => {
    await api(`/reviews/${id}/moderate`, { method: 'PUT', body: JSON.stringify({ status }) });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete review?')) return;
    await api(`/reviews/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <PageHeader title="Reviews" />
      <div className="mb-4 flex gap-2">
        {['', 'pending', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${filter === s ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-400">No reviews.</p>}
        {items.map((r) => (
          <div key={r._id} className="card flex flex-wrap items-start justify-between gap-3 p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                </span>
                <span className="font-semibold">{r.title || 'Review'}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : r.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                  {r.status}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
              <p className="mt-1 text-xs text-slate-400">
                {r.user?.name} on <strong>{r.product?.title}</strong> · {formatDate(r.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => moderate(r._id, 'approved')} className="rounded-lg bg-emerald-50 p-2 text-emerald-600" title="Approve"><Check className="h-4 w-4" /></button>
              <button onClick={() => moderate(r._id, 'rejected')} className="rounded-lg bg-amber-50 p-2 text-amber-600" title="Reject"><X className="h-4 w-4" /></button>
              <button onClick={() => remove(r._id)} className="rounded-lg bg-red-50 p-2 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
