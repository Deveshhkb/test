'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, Tag, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/utils';
import CartRecommendations from '@/components/cart/CartRecommendations';

export default function CartPage() {
  const { cart, summary, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <>
        <Empty title="Your bag is empty" cta="Start Shopping" href="/collections/new-arrivals" note="Looks like you haven't added anything yet." />
        <CartRecommendations />
      </>
    );
  }

  const handleCoupon = async () => {
    setMsg('');
    try {
      const m = await applyCoupon(code);
      setMsg(m);
      setCode('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Invalid coupon');
    }
  };

  return (
    <>
      <div className="container-nova py-8">
      <h1 className="mb-6 text-3xl font-black">Shopping Bag</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item._id} className="flex gap-4 rounded-2xl border border-ink/10 p-4">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-ink/5">
                {item.product?.images?.[0] && (
                  <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" sizes="96px" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/product/${item.product?.slug}`} className="font-semibold hover:text-nova-600">
                    {item.product?.title}
                  </Link>
                  <button onClick={() => removeItem(item._id)} aria-label="Remove" className="text-ink/40 hover:text-accent">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-ink/50">{[item.color, item.size].filter(Boolean).join(' · ')}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-full border border-ink/15">
                    <button onClick={() => updateItem(item._id, item.quantity - 1)} className="grid h-8 w-8 place-items-center" aria-label="Decrease">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateItem(item._id, item.quantity + 1)} className="grid h-8 w-8 place-items-center" aria-label="Increase">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-ink/10 p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 text-lg font-bold">Order Summary</h2>

          {!user ? (
            <div className="mb-4 rounded-xl bg-nova-50 px-3 py-2.5 text-sm text-ink/70">
              <Link href="/login?redirect=/cart" className="font-semibold text-nova-600 hover:underline">
                Log in
              </Link>{' '}
              to apply coupons — your bag carries over.
            </div>
          ) : cart?.coupon?.code ? (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-green-700">
                <Tag className="h-4 w-4" /> {cart.coupon.code} applied
              </span>
              <button onClick={removeCoupon} aria-label="Remove coupon">
                <X className="h-4 w-4 text-green-700" />
              </button>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="input !py-2.5"
                />
                <button onClick={handleCoupon} className="btn-outline shrink-0 !px-4 !py-2.5">
                  Apply
                </button>
              </div>
              {msg && <p className="mt-1.5 text-xs text-ink/60">{msg}</p>}
              <p className="mt-2 text-xs text-ink/40">Try: NOVA10, FIRST500</p>
            </div>
          )}

          <div className="space-y-2 border-t border-ink/10 pt-4 text-sm">
            <Row label="Subtotal" value={formatPrice(summary.itemsTotal)} />
            {summary.discount > 0 && <Row label="Discount" value={`-${formatPrice(summary.discount)}`} green />}
            <Row label="Shipping" value={summary.shippingFee === 0 ? 'Free' : formatPrice(summary.shippingFee)} />
            <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(summary.grandTotal)}</span>
            </div>
          </div>

          <Link href={user ? '/checkout' : '/login?redirect=/checkout'} className="btn-primary mt-5 w-full">
            Proceed to Checkout
          </Link>
        </aside>
      </div>
      </div>
      <CartRecommendations excludeIds={items.map((i) => i.product?._id).filter(Boolean) as string[]} />
    </>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={green ? 'font-medium text-green-600' : 'font-medium'}>{value}</span>
    </div>
  );
}

function Empty({ title, note, cta, href }: { title: string; note: string; cta: string; href: string }) {
  return (
    <div className="container-nova grid place-items-center py-24 text-center">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-ink/50">{note}</p>
      <Link href={href} className="btn-primary mt-6">
        {cta}
      </Link>
    </div>
  );
}
