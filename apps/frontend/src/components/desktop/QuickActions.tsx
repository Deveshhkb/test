'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, Gift, ArrowUp } from 'lucide-react';
import { useCart } from '@/context/CartContext';

/**
 * Floating quick actions. The AI chat button now lives in AiLauncher (its own
 * FAB at bottom-right); this stack sits above it so they don't overlap.
 */
export default function QuickActions() {
  const { summary, setOpen } = useCart();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed bottom-24 right-5 z-[80] flex flex-col items-center gap-2.5">
      <Link
        href="/collections/best-sellers"
        aria-label="Daily offers"
        className="press grid h-11 w-11 place-items-center rounded-full bg-surface text-accent shadow-lg ring-1 ring-ink/10 hover:bg-accent hover:text-white"
      >
        <Gift className="h-5 w-5" />
      </Link>
      <Link
        href="/account/wishlist"
        aria-label="Wishlist"
        className="press grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-ink/10 hover:bg-ink hover:text-white"
      >
        <Heart className="h-5 w-5" />
      </Link>
      <button
        onClick={() => setOpen(true)}
        aria-label="Cart"
        className="press relative grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-lg ring-1 ring-ink/10 hover:bg-ink hover:text-white"
      >
        <ShoppingBag className="h-5 w-5" />
        {summary.itemCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-nova-600 text-[10px] font-bold text-white">
            {summary.itemCount}
          </span>
        )}
      </button>
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="press animate-fade-up grid h-11 w-11 place-items-center rounded-full bg-ink text-white shadow-lg hover:bg-nova-700"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
