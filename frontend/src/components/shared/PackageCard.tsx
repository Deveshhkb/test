'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import type { TourPackage } from '@/lib/types';
import { localize, formatINR } from '@/lib/localize';
import Stars from './Stars';

export default function PackageCard({ pkg }: { pkg: TourPackage }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <article className="card group flex flex-col hover:-translate-y-1.5 hover:shadow-glow">
      <Link href={`/packages/${pkg.slug}`} className="relative block aspect-[4/3] overflow-hidden">
        <Image
          src={pkg.coverImage}
          alt={localize(pkg.title, lang)}
          fill
          sizes="(max-width:768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {pkg.discountPrice && (
          <span className="absolute left-3 top-3 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-ink">
            {Math.round(((pkg.price - pkg.discountPrice) / pkg.price) * 100)}% OFF
          </span>
        )}
        <span className="absolute right-3 top-3 chip bg-white/90 backdrop-blur">
          <FaClock className="mr-1 h-3 w-3" /> {pkg.durationDays}{t('common.days').charAt(0)}/{pkg.durationNights}N
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-gray-400">
          <FaMapMarkerAlt className="h-3 w-3 text-primary" />
          {pkg.destinations.join(' • ')}
        </div>
        <h3 className="font-heading text-lg font-semibold text-ink">
          <Link href={`/packages/${pkg.slug}`} className="hover:text-primary">
            {localize(pkg.title, lang)}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{localize(pkg.summary, lang)}</p>

        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <Stars rating={pkg.rating} />
          <span>{pkg.rating} ({pkg.reviewsCount} {t('common.reviews')})</span>
        </div>

        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <span className="text-xs text-gray-400">{t('common.from')}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-primary">{formatINR(pkg.discountPrice ?? pkg.price)}</span>
              {pkg.discountPrice && <span className="text-sm text-gray-400 line-through">{formatINR(pkg.price)}</span>}
            </div>
          </div>
          <Link href={`/packages/${pkg.slug}`} className="btn-primary !px-4 !py-2">
            {t('common.viewDetails')}
          </Link>
        </div>
      </div>
    </article>
  );
}
