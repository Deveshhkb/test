'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import { galleryItems } from '@/data/content';
import PageHeader from '@/components/shared/PageHeader';
import Reveal from '@/components/shared/Reveal';

const CATEGORIES = ['All', 'Temples', 'Aarti', 'Ghats', 'Festivals', 'Nature', 'Pilgrims'];

export default function GalleryView() {
  const { t } = useTranslation();
  const [category, setCategory] = useState('All');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const items = useMemo(
    () => (category === 'All' ? galleryItems : galleryItems.filter((g) => g.category === category)),
    [category]
  );

  return (
    <>
      <PageHeader title={t('gallery.title')} subtitle={t('gallery.subtitle')} />
      <section className="section">
        <div className="container-px">
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${category === c ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-primary'}`}>
                {c === 'All' ? t('common.all') : c}
              </button>
            ))}
          </div>

          {/* Masonry layout via CSS columns */}
          <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
            {items.map((g, i) => (
              <Reveal key={i} delay={(i % 4) * 0.05} className="mb-4 break-inside-avoid">
                <button onClick={() => setLightbox(g.url)} className="group relative block w-full overflow-hidden rounded-2xl">
                  <Image src={g.url} alt={g.title} width={500} height={i % 3 === 0 ? 650 : 400} className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                    {g.title}
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-5 top-5 text-white" aria-label="Close"><FaTimes className="h-7 w-7" /></button>
          <div className="relative h-[80vh] w-full max-w-5xl">
            <Image src={lightbox} alt="preview" fill className="object-contain" sizes="100vw" />
          </div>
        </div>
      )}
    </>
  );
}
