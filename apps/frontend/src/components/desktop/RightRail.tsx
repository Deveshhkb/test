'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck, ShoppingBag, Ticket, Clock, Sparkles, PanelRightClose, PanelRightOpen, Copy, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';
import SocialProof from './SocialProof';

const FREE_SHIP_THRESHOLD = 999;

function titleFromSlug(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function RightRail() {
  const { summary, setOpen } = useCart();
  const [collapsed, setCollapsed] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('nova-rail-collapsed') === '1');
    try {
      setRecent(JSON.parse(localStorage.getItem('nova_recent') || '[]').slice(0, 4));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem('nova-rail-collapsed', c ? '0' : '1');
      return !c;
    });
  };

  const remaining = Math.max(0, FREE_SHIP_THRESHOLD - summary.itemsTotal);
  const progress = Math.min(100, (summary.itemsTotal / FREE_SHIP_THRESHOLD) * 100);

  const copyCoupon = () => {
    navigator.clipboard?.writeText('NOVA10');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (collapsed) {
    return (
      <aside className="sticky top-24 hidden h-fit flex-col items-center gap-3 rounded-2xl border border-ink/10 bg-surface p-2 2xl:flex">
        <button onClick={toggle} aria-label="Expand tools" className="press grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5">
          <PanelRightOpen className="h-5 w-5" />
        </button>
        <button onClick={() => setOpen(true)} aria-label="Cart" className="press grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5">
          <ShoppingBag className="h-5 w-5" />
        </button>
        <Link href="/collections/best-sellers" aria-label="Offers" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-ink/5">
          <Ticket className="h-5 w-5" />
        </Link>
      </aside>
    );
  }

  return (
    <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] flex-col gap-4 overflow-y-auto 2xl:flex">
      {/* Free shipping progress */}
      <div className="rounded-2xl border border-ink/10 bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <Truck className="h-4 w-4 text-nova-600" /> Free Shipping
          </p>
          <button onClick={toggle} aria-label="Collapse tools" className="press text-ink/40 hover:text-ink">
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
        {remaining > 0 ? (
          <p className="text-xs text-ink/60">
            Add <span className="font-semibold text-ink">{formatPrice(remaining)}</span> more to unlock free shipping.
          </p>
        ) : (
          <p className="text-xs font-medium text-green-600">🎉 You&apos;ve unlocked free shipping!</p>
        )}
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-gradient-to-r from-nova-500 to-nova-700 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Mini cart */}
      <div className="rounded-2xl border border-ink/10 bg-surface p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <ShoppingBag className="h-4 w-4 text-nova-600" /> Your Bag
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink/60">{summary.itemCount} item(s)</span>
          <span className="font-bold">{formatPrice(summary.grandTotal)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setOpen(true)} className="btn-outline flex-1 !px-3 !py-2 text-xs">View</button>
          <Link href="/checkout" className="btn-primary flex-1 !px-3 !py-2 text-xs">Checkout</Link>
        </div>
      </div>

      {/* Coupon / offers */}
      <div className="rounded-2xl border border-dashed border-nova-300 bg-nova-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-bold text-nova-800">
          <Ticket className="h-4 w-4" /> Today&apos;s Offer
        </p>
        <p className="mt-1 text-xs text-ink/70">Flat 10% off over ₹999</p>
        <button onClick={copyCoupon} className="mt-2 flex w-full items-center justify-between rounded-lg border border-nova-300 bg-surface px-3 py-2 text-sm font-bold text-nova-700">
          NOVA10
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      {/* Recently viewed */}
      {recent.length > 0 && (
        <div className="rounded-2xl border border-ink/10 bg-surface p-4">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Clock className="h-4 w-4 text-nova-600" /> Recently Viewed
          </p>
          <ul className="space-y-1.5">
            {recent.map((slug) => (
              <li key={slug}>
                <Link href={`/product/${slug}`} className="block truncate rounded-lg px-2 py-1.5 text-xs text-ink/70 hover:bg-ink/5 hover:text-ink">
                  {titleFromSlug(slug)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Social proof */}
      <div className="rounded-2xl border border-ink/10 bg-surface p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">
          <Sparkles className="h-4 w-4 text-nova-600" /> Why Clothinary
        </p>
        <SocialProof />
      </div>
    </aside>
  );
}
