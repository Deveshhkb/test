'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, XCircle, RotateCcw, RefreshCw, MapPin, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { formatPrice, cn } from '@/lib/utils';
import type { Order } from '@/lib/types';

const FLOW = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
const FLOW_LABELS: Record<string, string> = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

const canCancel = (s: string) => !['shipped', 'delivered', 'cancelled', 'returned'].includes(s);
const canReturn = (s: string) => s === 'delivered';

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addItem, setOpen } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api<{ order: Order }>(`/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: 'cancel' | 'return', reason?: string) => {
    setBusy(true);
    setError('');
    try {
      const { order: updated } = await api<{ order: Order }>(`/orders/${id}/${action}`, {
        method: 'PUT',
        body: JSON.stringify(reason ? { reason } : {}),
      });
      setOrder(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const reorder = async () => {
    if (!order) return;
    setBusy(true);
    try {
      for (const it of order.items) {
        if (it.product) {
          await addItem({ productId: it.product, size: it.size, color: it.color, quantity: it.quantity });
        }
      }
      setOpen(false);
      router.push('/cart');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="text-ink/50">Loading order…</p>;
  if (!order) return <p className="text-accent">{error || 'Order not found.'}</p>;

  const isCancelled = order.status === 'cancelled';
  const isReturned = order.status === 'returned';
  const reachedIndex = FLOW.indexOf(order.status);

  return (
    <div className="max-w-3xl">
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Order #{order.orderNumber}</h1>
          <p className="text-sm text-ink/50">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold capitalize',
            isCancelled ? 'bg-red-100 text-red-700' : isReturned ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'
          )}
        >
          {order.status}
        </span>
      </div>

      {error && <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">{error}</p>}

      {/* Tracking timeline */}
      <div className="mt-6 rounded-2xl border border-ink/10 p-6">
        <h2 className="mb-5 font-bold">Order Tracking</h2>
        {isCancelled || isReturned ? (
          <div className="flex items-center gap-3">
            <span className={cn('grid h-9 w-9 place-items-center rounded-full text-white', isCancelled ? 'bg-red-500' : 'bg-gray-500')}>
              {isCancelled ? <XCircle className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
            </span>
            <div>
              <p className="font-semibold capitalize">{order.status}</p>
              <p className="text-sm text-ink/50">
                {isCancelled
                  ? 'This order was cancelled. Any payment will be refunded to the original source.'
                  : 'Return requested — refund will be processed within 5–7 business days.'}
              </p>
            </div>
          </div>
        ) : (
          <ol className="relative ml-3 border-l-2 border-ink/10">
            {FLOW.map((step, i) => {
              const done = i <= reachedIndex;
              const active = i === reachedIndex;
              const event = order.statusHistory?.find((h) => h.status === step);
              return (
                <li key={step} className="mb-6 ml-6 last:mb-0">
                  <span
                    className={cn(
                      'absolute -left-[13px] grid h-6 w-6 place-items-center rounded-full ring-4 ring-white',
                      done ? 'bg-nova-600 text-white' : 'bg-ink/10 text-ink/40'
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                  </span>
                  <p className={cn('font-semibold', active && 'text-nova-700')}>{FLOW_LABELS[step]}</p>
                  {event?.at && <p className="text-xs text-ink/50">{new Date(event.at).toLocaleString()}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Items */}
      <div className="mt-6 rounded-2xl border border-ink/10 p-6">
        <h2 className="mb-4 font-bold">Items ({order.items.length})</h2>
        <div className="space-y-4">
          {order.items.map((it, i) => (
            <div key={i} className="flex gap-4">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                {it.image && <Image src={it.image} alt={it.title} fill className="object-cover" sizes="64px" />}
              </div>
              <div className="flex-1">
                <p className="font-medium">{it.title}</p>
                <p className="text-sm text-ink/50">
                  {[it.color, it.size].filter(Boolean).join(' · ')} · Qty {it.quantity}
                </p>
              </div>
              <p className="font-semibold">{formatPrice(it.price * it.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Address + Payment */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {order.shippingAddress && (
          <div className="rounded-2xl border border-ink/10 p-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <MapPin className="h-4 w-4 text-nova-600" /> Shipping Address
            </h2>
            <p className="text-sm font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-sm text-ink/60">{order.shippingAddress.phone}</p>
            <p className="mt-1 text-sm text-ink/60">
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}, {order.shippingAddress.city},{' '}
              {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-ink/10 p-6">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <CreditCard className="h-4 w-4 text-nova-600" /> Payment
          </h2>
          <div className="space-y-1.5 text-sm">
            <Row label="Method" value={(order.paymentMethod || 'razorpay').toUpperCase()} />
            <Row label="Payment status" value={order.paymentStatus} className="capitalize" />
            {typeof order.itemsTotal === 'number' && <Row label="Items total" value={formatPrice(order.itemsTotal)} />}
            {order.discount ? <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`} value={`-${formatPrice(order.discount)}`} /> : null}
            <Row label="Shipping" value={order.shippingFee ? formatPrice(order.shippingFee) : 'Free'} />
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(order.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        {canCancel(order.status) && (
          <button
            onClick={() => confirm('Cancel this order?') && act('cancel')}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" /> Cancel Order
          </button>
        )}
        {canReturn(order.status) && (
          <button
            onClick={() => {
              const r = prompt('Reason for return (optional):');
              if (r !== null) act('return', r || undefined);
            }}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-semibold transition hover:border-nova-600 hover:text-nova-600 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" /> Return / Refund
          </button>
        )}
        <button onClick={reorder} disabled={busy} className="btn-outline !px-5 !py-2.5 text-sm disabled:opacity-50">
          <RefreshCw className="h-4 w-4" /> Reorder
        </button>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={cn('font-medium', className)}>{value}</span>
    </div>
  );
}
