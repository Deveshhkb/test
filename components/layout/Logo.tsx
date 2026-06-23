import Link from 'next/link';
import { GiLotusFlower } from 'react-icons/gi';
import { cn } from '@/utils';
import { siteConfig } from '@/lib/config';

export default function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label={siteConfig.name}>
      <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-saffron-500 to-gold-500 text-white shadow-gold transition-transform duration-500 group-hover:rotate-[18deg]">
        <GiLotusFlower className="text-2xl" />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            'block font-display text-xl font-bold',
            dark ? 'text-royal-950' : 'text-white text-shadow-lg',
          )}
        >
          Ayodhya<span className="text-gold-500"> Tirtham</span>
        </span>
        <span
          className={cn(
            'block text-[10px] font-semibold uppercase tracking-[0.25em]',
            dark ? 'text-royal-900/60' : 'text-white/70',
          )}
        >
          Sacred Journeys
        </span>
      </span>
    </Link>
  );
}
