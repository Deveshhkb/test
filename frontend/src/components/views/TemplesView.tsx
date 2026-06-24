'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { temples } from '@/data/content';
import { localize } from '@/lib/localize';
import PageHeader from '@/components/shared/PageHeader';
import Reveal from '@/components/shared/Reveal';

const CATEGORIES = ['All', 'Ram Temple', 'Shiva Temple', 'Krishna Temple', 'Hanuman Temple'];

export default function TemplesView({ initialCategory = 'All' }: { initialCategory?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [category, setCategory] = useState(initialCategory);

  const filtered = useMemo(
    () => (category === 'All' ? temples : temples.filter((tm) => tm.category === category)),
    [category]
  );

  return (
    <>
      <PageHeader title={t('temples.title')} subtitle={t('temples.subtitle')} />
      <section className="section">
        <div className="container-px">
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === c ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-primary'
                }`}
              >
                {c === 'All' ? t('common.all') : c}
              </button>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tm, i) => (
              <Reveal key={tm.slug} delay={i * 0.05}>
                <article className="card group flex flex-col">
                  <Link href={`/temples/${tm.slug}`} className="relative block aspect-[4/3] overflow-hidden">
                    <Image src={tm.coverImage} alt={localize(tm.name, lang)} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                    <span className="absolute left-3 top-3 chip bg-white/90">{tm.category}</span>
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-1 flex items-center gap-1 text-xs text-gray-400">
                      <FaMapMarkerAlt className="h-3 w-3 text-primary" /> {tm.destination}
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-ink">
                      <Link href={`/temples/${tm.slug}`} className="hover:text-primary">{localize(tm.name, lang)}</Link>
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">{localize(tm.description, lang)}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                      <FaClock className="h-3 w-3 text-primary" /> {tm.darshanTimings}
                    </div>
                    <Link href={`/temples/${tm.slug}`} className="mt-auto pt-4 text-sm font-semibold text-primary hover:underline">
                      {t('common.viewDetails')} →
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
