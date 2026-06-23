'use client';

import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { fadeUp, viewport } from '@/lib/animations';

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  light?: boolean;
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  light = false,
  className,
}: Props) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className={cn(
        'mb-12 max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && (
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold-100 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-gold-700">
          <span className="h-1.5 w-1.5 rounded-full bg-saffron-500" />
          {eyebrow}
        </span>
      )}
      <h2
        className={cn(
          'text-3xl font-bold leading-tight md:text-4xl lg:text-5xl',
          light ? 'text-white' : 'text-royal-950',
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-4 text-base md:text-lg', light ? 'text-white/80' : 'text-royal-900/70')}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
