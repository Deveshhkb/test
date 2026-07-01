'use client';

import Link from 'next/link';
import {
  LayoutGrid,
  Flame,
  Sparkles,
  Zap,
  Trophy,
  Heart,
  Ruler,
  MapPin,
  Headphones,
  ChevronRight,
} from 'lucide-react';

interface RailLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const CATEGORIES: RailLink[] = [
  { label: 'Men', href: '/men', icon: LayoutGrid },
  { label: 'Women', href: '/women', icon: LayoutGrid },
  { label: 'Footwear', href: '/footwear', icon: LayoutGrid },
  { label: 'Accessories', href: '/accessories', icon: LayoutGrid },
];

const COLLECTIONS: RailLink[] = [
  { label: 'Trending', href: '/collections/trending', icon: Flame, badge: 'HOT' },
  { label: 'New Arrivals', href: '/collections/new-arrivals', icon: Sparkles },
  { label: 'Flash Sale', href: '/collections/best-sellers', icon: Zap, badge: '-50%' },
  { label: 'Best Sellers', href: '/collections/best-sellers', icon: Trophy },
];

const HELP: RailLink[] = [
  { label: 'Wishlist', href: '/account/wishlist', icon: Heart },
  { label: 'Size Guide', href: '/page/shipping-returns', icon: Ruler },
  { label: 'Store Locator', href: '/page/about', icon: MapPin },
  { label: 'Support', href: '/page/about', icon: Headphones },
];

function Group({ title, links }: { title: string; links: RailLink[] }) {
  return (
    <div>
      <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-ink/40">{title}</p>
      <ul className="space-y-0.5">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <li key={l.label}>
              <Link
                href={l.href}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-ink/75 transition hover:bg-ink/5 hover:text-ink"
              >
                <Icon className="h-4 w-4 shrink-0 text-ink/50 group-hover:text-nova-600" />
                <span className="flex-1">{l.label}</span>
                {l.badge && (
                  <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                    {l.badge}
                  </span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-ink/20 transition group-hover:translate-x-0.5 group-hover:text-ink/40" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function LeftRail() {
  return (
    <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] flex-col gap-5 overflow-y-auto rounded-2xl border border-ink/10 bg-surface p-4 xl:flex">
      <Group title="Shop by Category" links={CATEGORIES} />
      <div className="h-px bg-ink/5" />
      <Group title="Collections" links={COLLECTIONS} />
      <div className="h-px bg-ink/5" />
      <Group title="Quick Links" links={HELP} />

      {/* Promo card */}
      <Link
        href="/collections/new-arrivals"
        className="lift mt-1 block overflow-hidden rounded-xl bg-gradient-to-br from-nova-600 to-nova-800 p-4 text-white"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Premium</p>
        <p className="mt-1 text-lg font-black leading-tight">Limited Edition Drop</p>
        <p className="mt-1 text-xs text-white/80">Shop the exclusive collection →</p>
      </Link>
    </aside>
  );
}
