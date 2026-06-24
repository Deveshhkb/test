'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSearch } from 'react-icons/fa';
import { destinations } from '@/data/content';
import { localize } from '@/lib/localize';
import PageHeader from '@/components/shared/PageHeader';
import DestinationCard from '@/components/shared/DestinationCard';
import Reveal from '@/components/shared/Reveal';

export default function DestinationsView() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'rating' | 'name'>('rating');

  const filtered = useMemo(() => {
    let list = destinations.filter((d) => localize(d.name, lang).toLowerCase().includes(query.toLowerCase()));
    list = [...list].sort((a, b) =>
      sort === 'rating' ? b.rating - a.rating : localize(a.name, lang).localeCompare(localize(b.name, lang))
    );
    return list;
  }, [query, sort, lang]);

  return (
    <>
      <PageHeader title={t('destinations.title')} subtitle={t('destinations.subtitle')} />
      <section className="section">
        <div className="container-px">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-11"
                placeholder={t('destinations.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select className="input sm:w-48" value={sort} onChange={(e) => setSort(e.target.value as 'rating' | 'name')}>
              <option value="rating">{t('destinations.sortRating')}</option>
              <option value="name">{t('destinations.sortName')}</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="py-16 text-center text-gray-400">{t('destinations.noResults')}</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((d, i) => (
                <Reveal key={d.slug} delay={i * 0.05}>
                  <div id={d.slug}>
                    <DestinationCard dest={d} />
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
