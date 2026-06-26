import { Leaf, Truck, RefreshCw, BadgeCheck } from 'lucide-react';
import Reveal from '@/components/animation/Reveal';

const PILLARS = [
  { icon: BadgeCheck, title: 'Original Designs', body: 'Every piece is designed in-house — no copies, just NovaStyle.' },
  { icon: Leaf, title: 'Responsibly Made', body: 'Premium, breathable fabrics sourced with care for everyday wear.' },
  { icon: Truck, title: 'Fast & Free', body: 'Free shipping over ₹999, dispatched within 24 hours.' },
  { icon: RefreshCw, title: 'Easy Returns', body: 'Changed your mind? 7-day hassle-free returns, no questions asked.' },
];

export default function BrandStory() {
  return (
    <section className="container-nova py-14">
      <Reveal direction="up" className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-2xl font-black sm:text-3xl">Designed to be different</h2>
        <p className="mt-2 text-ink/50">
          We build original, comfortable, expressive everyday wear — and back it with a
          shopping experience you&apos;ll actually enjoy.
        </p>
      </Reveal>

      <Reveal stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="rounded-2xl border border-ink/10 p-6 card-hover">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-nova-50 text-nova-600">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-ink/60">{p.body}</p>
            </div>
          );
        })}
      </Reveal>
    </section>
  );
}
