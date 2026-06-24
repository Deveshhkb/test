'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaMapMarkerAlt } from 'react-icons/fa';
import type { Destination } from '@/lib/types';
import { localize } from '@/lib/localize';
import Stars from './Stars';

export default function DestinationCard({ dest }: { dest: Destination }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <Link href={`/destinations#${dest.slug}`} className="card group relative block aspect-[3/4] overflow-hidden">
      <Image
        src={dest.coverImage}
        alt={localize(dest.name, lang)}
        fill
        sizes="(max-width:768px) 100vw, 25vw"
        className="object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <div className="mb-1 flex items-center gap-1 text-xs text-white/80">
          <FaMapMarkerAlt className="h-3 w-3" /> {dest.state}
        </div>
        <h3 className="font-heading text-xl font-bold">{localize(dest.name, lang)}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-white/80">{localize(dest.shortDescription, lang)}</p>
        <div className="mt-2 flex items-center justify-between">
          <Stars rating={dest.rating} />
          <span className="chip bg-white/15 text-white">{dest.templeCount} {t('destinations.templesCount')}</span>
        </div>
      </div>
    </Link>
  );
}
