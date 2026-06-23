'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiClock, FiMapPin, FiCheck } from 'react-icons/fi';
import type { TourPackage } from '@/types';
import { fadeUp } from '@/lib/animations';
import { formatPrice } from '@/utils';
import Rating from '@/components/ui/Rating';

export default function PackageCard({ pkg, index = 0 }: { pkg: TourPackage; index?: number }) {
  return (
    <motion.article
      id={pkg.slug}
      variants={fadeUp}
      custom={index % 3}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-glass ring-1 ring-royal-900/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-gold-lg"
    >
      <div className="relative h-56 overflow-hidden">
        <Image
          src={pkg.image}
          alt={pkg.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {pkg.popular && (
          <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 px-3 py-1 text-xs font-bold text-white">
            Popular
          </span>
        )}
        <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-royal-950 shadow-md">
          {formatPrice(pkg.price)}
          {pkg.oldPrice && (
            <span className="ml-1.5 text-xs font-normal text-royal-900/40 line-through">
              {formatPrice(pkg.oldPrice)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <Rating value={pkg.rating} />
        <h3 className="mt-3 text-xl font-bold text-royal-950">{pkg.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-royal-900/60">
          <span className="flex items-center gap-1.5">
            <FiMapPin className="text-gold-500" /> {pkg.destination}
          </span>
          <span className="flex items-center gap-1.5">
            <FiClock className="text-gold-500" /> {pkg.duration}
          </span>
        </div>

        <ul className="mt-4 flex flex-1 flex-wrap gap-2">
          {pkg.facilities.slice(0, 4).map((f) => (
            <li
              key={f}
              className="inline-flex items-center gap-1 rounded-full bg-gold-50 px-3 py-1 text-xs font-medium text-royal-900/80"
            >
              <FiCheck className="text-gold-500" /> {f}
            </li>
          ))}
        </ul>

        <a
          href={`#book-${pkg.slug}`}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 px-6 py-3 text-sm font-semibold text-white shadow-gold transition-all hover:shadow-gold-lg"
        >
          Book This Yatra
        </a>
      </div>
    </motion.article>
  );
}
