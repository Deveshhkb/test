'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { packages } from '@/data/content';
import PageHeader from '@/components/shared/PageHeader';
import PackageCard from '@/components/shared/PackageCard';
import Reveal from '@/components/shared/Reveal';

export default function PackagesView() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<'popular' | 'price_asc' | 'price_desc' | 'rating'>('popular');

  const sorted = useMemo(() => {
    const list = [...packages];
    const price = (p: (typeof packages)[number]) => p.discountPrice ?? p.price;
    switch (sort) {
      case 'price_asc':
        return list.sort((a, b) => price(a) - price(b));
      case 'price_desc':
        return list.sort((a, b) => price(b) - price(a));
      case 'rating':
        return list.sort((a, b) => b.rating - a.rating);
      default:
        return list.sort((a, b) => Number(b.popular) - Number(a.popular));
    }
  }, [sort]);

  return (
    <>
      <PageHeader title={t('packages.title')} subtitle={t('packages.subtitle')} />
      <section className="section">
        <div className="container-px">
          <div className="mb-10 flex items-center justify-between">
            <p className="text-sm text-gray-500">{packages.length} {t('packages.title').toLowerCase()}</p>
            <select className="input w-52" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="popular">{t('common.sort')}: Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.05}>
                <PackageCard pkg={p} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
