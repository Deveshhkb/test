'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { packages } from '@/data/content';
import SectionHeading from '@/components/shared/SectionHeading';
import PackageCard from '@/components/shared/PackageCard';
import Reveal from '@/components/shared/Reveal';

export default function PopularPackages() {
  const { t } = useTranslation();
  const popular = packages.filter((p) => p.popular || p.featured).slice(0, 3);

  return (
    <section className="section bg-primary-50/40">
      <div className="container-px">
        <SectionHeading
          eyebrow="🧳"
          title={t('sections.popularPackagesTitle')}
          subtitle={t('sections.popularPackagesSubtitle')}
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {popular.map((p, i) => (
            <Reveal key={p.slug} delay={i * 0.08}>
              <PackageCard pkg={p} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/packages" className="btn-primary">{t('common.viewAll')}</Link>
        </div>
      </div>
    </section>
  );
}
