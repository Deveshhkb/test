'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ShoppingBag, MessageCircle, Gift, ArrowUp, X, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// Canned "AI assistant" suggestions — links into existing collections.
const SUGGESTIONS = [
  { label: 'Trending outfits', href: '/collections/trending' },
  { label: 'New this week', href: '/collections/new-arrivals' },
  { label: 'Best sellers', href: '/collections/best-sellers' },
  { label: 'Sneakers for me', href: '/footwear' },
];

export default function QuickActions() {
  const { summary, setOpen } = useCart();
  const [showTop, setShowTop] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* AI Fashion Assistant popover */}
      {chatOpen && (
        <div className="animate-fade-up fixed bottom-24 right-5 z-[75] w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-ink/10 bg-surface shadow-2xl">
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-nova-600 to-nova-800 px-4 py-3 text-white">
            <p className="flex items-center gap-2 font-bold">
              <Sparkles className="h-4 w-4" /> AI Fashion Assistant
            </p>
            <button onClick={() => setChatOpen(false)} aria-label="Close assistant">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-ink/70">Hi! 👋 What are you shopping for today?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  onClick={() => setChatOpen(false)}
                  className="chip press hover:border-nova-500 hover:text-nova-700"
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating stack */}
      <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-center gap-2.5">
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
        <button
          onClick={() => setChatOpen((o) => !o)}
          aria-label="Chat with AI assistant"
          className="press grid h-12 w-12 place-items-center rounded-full bg-nova-600 text-white shadow-xl hover:bg-nova-700"
        >
          <MessageCircle className="h-5 w-5" />
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
    </>
  );
}
