'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { destinations } from '@/data/content';
import SectionHeading from '@/components/shared/SectionHeading';
import DestinationCard from '@/components/shared/DestinationCard';
import Reveal from '@/components/shared/Reveal';

export default function FeaturedDestinations() {
  const { t } = useTranslation();
  const featured = destinations.filter((d) => d.featured).slice(0, 4);

  return (
    <section className="section">
      <div className="container-px">
        <SectionHeading
          eyebrow="🛕"
          title={t('sections.featuredDestinationsTitle')}
          subtitle={t('sections.featuredDestinationsSubtitle')}
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((d, i) => (
            <Reveal key={d.slug} delay={i * 0.08}>
              <DestinationCard dest={d} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/destinations" className="btn-ghost">{t('common.viewAll')}</Link>
        </div>
      </div>
    </section>
  );
}
