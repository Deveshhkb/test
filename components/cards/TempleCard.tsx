'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMapPin, FiArrowRight } from 'react-icons/fi';
import type { Temple } from '@/types';
import { fadeUp } from '@/lib/animations';
import Rating from '@/components/ui/Rating';
import { cn } from '@/utils';

interface Props {
  temple: Temple;
  index?: number;
  view?: 'grid' | 'list';
}

export default function TempleCard({ temple, index = 0, view = 'grid' }: Props) {
  return (
    <motion.article
      variants={fadeUp}
      custom={index % 3}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={cn(
        'group overflow-hidden rounded-3xl bg-white shadow-glass ring-1 ring-royal-900/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-gold-lg',
        view === 'list' && 'sm:flex',
      )}
    >
      <Link
        href={`/temples/${temple.slug}`}
        className={cn('relative block overflow-hidden', view === 'list' ? 'sm:w-72 sm:shrink-0' : '')}
      >
        <div className={cn('relative', view === 'list' ? 'h-56 sm:h-full' : 'h-60')}>
          <Image
            src={temple.image}
            alt={temple.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-royal-950/60 via-transparent to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-royal-900 backdrop-blur">
            {temple.category}
          </span>
          {temple.featured && (
            <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 px-3 py-1 text-xs font-bold text-white">
              Featured
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <Rating value={temple.rating} count={temple.reviewCount} />
        <Link href={`/temples/${temple.slug}`}>
          <h3 className="mt-3 text-xl font-bold text-royal-950 transition-colors group-hover:text-gold-600">
            {temple.name}
          </h3>
        </Link>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-royal-900/60">
          <FiMapPin className="text-gold-500" /> {temple.city}, {temple.state}
        </p>
        <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-royal-900/70">
          {temple.shortDescription}
        </p>
        <Link
          href={`/temples/${temple.slug}`}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold-600 transition-all group-hover:gap-3"
        >
          View Details <FiArrowRight />
        </Link>
      </div>
    </motion.article>
  );
}
