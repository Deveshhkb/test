'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ orders: Order[] }>('/orders')
      .then((d) => setOrders(d.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-ink/50">Loading orders...</p>;

  return (
    <div>
      <h1 className="text-2xl font-black">My Orders</h1>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
