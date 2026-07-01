'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { XCircle, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  returned: 'bg-gray-100 text-gray-700',
};

// An order can be cancelled until it ships.
const canCancel = (status: string) =>
  !['shipped', 'delivered', 'cancelled', 'returned'].includes(status);
// A delivered order can be returned (backend enforces the 7-day window).
const canReturn = (status: string) => status === 'delivered';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ orders: Order[] }>('/orders')
      .then((d) => setOrders(d.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const runAction = async (id: string, action: 'cancel' | 'return', reason?: string) => {
    setBusyId(id);
    setError('');
    try {
      const { order } = await api<{ order: Order }>(`/orders/${id}/${action}`, {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
      });
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: order.status } : o)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = (id: string) => {
    if (confirm('Cancel this order? This cannot be undone.')) runAction(id, 'cancel');
  };
  const requestReturn = (id: string) => {
    const reason = prompt('Reason for return (optional):') ?? '';
    if (reason !== null) runAction(id, 'return', reason || undefined);
  };

  if (loading) return <p className="text-ink/50">Loading orders...</p>;

  return (
    <div>
      <h1 className="text-2xl font-black">My Orders</h1>
      {error && <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-ink/10 p-10 text-center">
          <p className="text-ink/50">You haven&apos;t placed any orders yet.</p>
          <Link href="/collections/new-arrivals" className="btn-primary mt-4">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o._id} className="rounded-2xl border border-ink/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
                <div>
                  <p className="font-semibold">#{o.orderNumber}</p>
                  <p className="text-xs text-ink/50">
                    Placed on {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', STATUS_COLORS[o.status] || 'bg-ink/10')}>
                    {o.status}
                  </span>
                  <span className="font-bold">{formatPrice(o.grandTotal)}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-3 overflow-x-auto">
                {o.items.map((it, i) => (
                  <div key={i} className="flex shrink-0 items-center gap-2">
                    <div className="relative h-14 w-12 overflow-hidden rounded-lg bg-ink/5">
                      {it.image && <Image src={it.image} alt={it.title} fill className="object-cover" sizes="48px" />}
                    </div>
                    <div className="text-xs">
                      <p className="line-clamp-1 max-w-[140px] font-medium">{it.title}</p>
                      <p className="text-ink/50">Qty {it.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              {(canCancel(o.status) || canReturn(o.status)) && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
                  {canCancel(o.status) && (
                    <button
                      onClick={() => cancel(o._id)}
                      disabled={busyId === o._id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {busyId === o._id ? 'Cancelling…' : 'Cancel Order'}
                    </button>
                  )}
                  {canReturn(o.status) && (
                    <button
                      onClick={() => requestReturn(o._id)}
                      disabled={busyId === o._id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold transition hover:border-nova-600 hover:text-nova-600 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {busyId === o._id ? 'Requesting…' : 'Return / Refund'}
                    </button>
                  )}
                </div>
              )}

              {o.status === 'returned' && (
                <p className="mt-3 border-t border-ink/10 pt-3 text-sm text-ink/50">
                  Return requested — our team will process your refund within 5–7 business days.
                </p>
              )}
              {o.status === 'cancelled' && (
                <p className="mt-3 border-t border-ink/10 pt-3 text-sm text-ink/50">
                  This order was cancelled. Any payment made will be refunded to the original source.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
