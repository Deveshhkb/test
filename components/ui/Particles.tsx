'use client';

import { useMemo } from 'react';
import { cn } from '@/utils';

interface Props {
  count?: number;
  className?: string;
  color?: string;
}

/**
 * Subtle floating particle background. Pure CSS animation (no canvas) so it is
 * cheap to render and respects prefers-reduced-motion via globals.css.
 */
export default function Particles({ count = 18, className, color = 'bg-gold-300/40' }: Props) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        // Deterministic pseudo-random based on index keeps SSR/CSR in sync.
        const seed = (i * 9301 + 49297) % 233280;
        const rnd = seed / 233280;
        const rnd2 = ((i * 4096 + 150889) % 714025) / 714025;
        return {
          left: `${(rnd * 100).toFixed(2)}%`,
          size: `${(4 + rnd2 * 10).toFixed(1)}px`,
          delay: `${(rnd * 8).toFixed(2)}s`,
          duration: `${(7 + rnd2 * 9).toFixed(2)}s`,
          top: `${(rnd2 * 100).toFixed(2)}%`,
        };
      }),
    [count],
  );

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className={cn('absolute rounded-full blur-[1px] animate-float', color)}
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}
