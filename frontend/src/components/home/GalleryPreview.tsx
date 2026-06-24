'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { galleryItems } from '@/data/content';
import SectionHeading from '@/components/shared/SectionHeading';
import Reveal from '@/components/shared/Reveal';

export default function GalleryPreview() {
  const { t } = useTranslation();
  const items = galleryItems.slice(0, 6);

  return (
    <section className="section">
      <div className="container-px">
        <SectionHeading eyebrow="📸" title={t('sections.galleryTitle')} subtitle={t('sections.gallerySubtitle')} />
        <div className="mt-12 grid auto-rows-[180px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((g, i) => (
            <Reveal
              key={i}
              delay={i * 0.05}
              className={`group relative overflow-hidden rounded-2xl ${i === 0 ? 'col-span-2 row-span-2' : ''}`}
            >
              <Image src={g.url} alt={g.title} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="absolute bottom-3 left-3 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                {g.title}
              </span>
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/gallery" className="btn-ghost">{t('common.viewAll')}</Link>
        </div>
      </div>
    </section>
  );
}
