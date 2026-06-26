'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice } from '@/lib/utils';

export default function CartDrawer() {
  const { open, setOpen, cart, summary, updateItem, removeItem, loading } = useCart();
  const { user } = useAuth();
  const items = cart?.items || [];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white"
          >
            <div className="flex items-center justify-between border-b border-ink/10 p-5">
              <h2 className="text-lg font-bold">Your Bag ({summary.itemCount})</h2>
              <button onClick={() => setOpen(false)} aria-label="Close cart">
                <X className="h-6 w-6" />
              </button>
            </div>

            {!user ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-ink/20" />
                <p className="text-ink/60">Please log in to view your bag.</p>
                <Link href="/login" onClick={() => setOpen(false)} className="btn-primary">
                  Login
                </Link>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-ink/20" />
                <p className="text-ink/60">Your bag is empty.</p>
                <Link href="/collections/new-arrivals" onClick={() => setOpen(false)} className="btn-primary">
                  Start Shopping
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {items.map((item) => (
                    <div key={item._id} className="flex gap-3">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                        {item.product?.images?.[0] && (
                          <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" sizes="80px" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <p className="text-sm font-medium">{item.product?.title}</p>
                        <p className="text-xs text-ink/50">
                          {[item.color, item.size].filter(Boolean).join(' · ')}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold">{formatPrice(item.price)}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-ink/15">
                            <button
                              onClick={() => updateItem(item._id, item.quantity - 1)}
                              disabled={loading}
                              className="grid h-7 w-7 place-items-center"
                              aria-label="Decrease"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <button
                              onClick={() => updateItem(item._id, item.quantity + 1)}
                              disabled={loading}
                              className="grid h-7 w-7 place-items-center"
                              aria-label="Increase"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button onClick={() => removeItem(item._id)} aria-label="Remove" className="text-ink/40 hover:text-accent">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-ink/10 p-5">
                  <div className="mb-3 space-y-1.5 text-sm">
                    <Row label="Subtotal" value={formatPrice(summary.itemsTotal)} />
                    {summary.discount > 0 && (
                      <Row label="Discount" value={`-${formatPrice(summary.discount)}`} accent />
                    )}
                    <Row
                      label="Shipping"
                      value={summary.shippingFee === 0 ? 'Free' : formatPrice(summary.shippingFee)}
                    />
                    <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold">
                      <span>Total</span>
                      <span>{formatPrice(summary.grandTotal)}</span>
                    </div>
                  </div>
                  <Link href="/checkout" onClick={() => setOpen(false)} className="btn-primary w-full">
                    Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={accent ? 'font-medium text-green-600' : 'font-medium'}>{value}</span>
    </div>
  );
}
