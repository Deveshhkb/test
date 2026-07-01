import Link from 'next/link';
import Reveal from '@/components/animation/Reveal';

// Premium promo cards shown between home sections.
const CARDS = [
  { title: 'Summer Sale', sub: 'Up to 50% off', href: '/collections/best-sellers', from: 'from-orange-500', to: 'to-pink-600' },
  { title: 'Buy 2 Get 1', sub: 'On tees & basics', href: '/men', from: 'from-nova-500', to: 'to-nova-800' },
  { title: 'Premium Collection', sub: 'Elevated essentials', href: '/collections/new-arrivals', from: 'from-slate-700', to: 'to-slate-900' },
  { title: 'Limited Edition', sub: 'While stocks last', href: '/collections/trending', from: 'from-emerald-500', to: 'to-teal-700' },
];

export default function PromoStrip() {
  return (
    <section className="container-nova py-6">
      <Reveal stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className={`lift relative flex h-32 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${c.from} ${c.to} p-4 text-white`}
          >
            <p className="text-lg font-black leading-tight">{c.title}</p>
            <p className="text-xs text-white/80">{c.sub}</p>
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
