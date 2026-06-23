'use client';

import { GiTempleGate, GiPathDistance } from 'react-icons/gi';
import { FiUsers, FiAward } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import type { Stat } from '@/types';
import { useCountUp } from '@/hooks/useCountUp';
import { formatCompact } from '@/utils';
import Particles from '@/components/ui/Particles';

const icons: Record<string, IconType> = {
  temple: GiTempleGate,
  users: FiUsers,
  route: GiPathDistance,
  award: FiAward,
};

function StatItem({ stat }: { stat: Stat }) {
  const { value, ref } = useCountUp(stat.value);
  const Icon = icons[stat.icon] ?? FiAward;

  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 text-3xl text-gold-400 ring-1 ring-white/20">
        <Icon />
      </span>
      <span ref={ref} className="font-display text-4xl font-bold text-white md:text-5xl">
        {formatCompact(value)}
        {stat.suffix}
      </span>
      <span className="mt-1 text-sm font-medium uppercase tracking-wider text-white/70">
        {stat.label}
      </span>
    </div>
  );
}

export default function StatsCounter({ stats }: { stats: Stat[] }) {
  return (
    <section className="relative overflow-hidden bg-saffron-royal py-20">
      <div className="absolute inset-0 bg-royal-950/70" />
      <Particles count={16} color="bg-white/30" />
      <div className="container relative grid grid-cols-2 gap-10 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatItem key={stat.id} stat={stat} />
        ))}
      </div>
    </section>
  );
}
