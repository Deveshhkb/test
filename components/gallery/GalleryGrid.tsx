'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { GalleryImage } from '@/types';
import { galleryCategories } from '@/lib/data/gallery';
import Lightbox from '@/components/media/Lightbox';
import { cn } from '@/utils';

export default function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [filter, setFilter] = useState('All');
  const [active, setActive] = useState<number | null>(null);

  const filtered = useMemo(
    () => (filter === 'All' ? images : images.filter((i) => i.category === filter)),
    [filter, images],
  );

  const slides = filtered.map((i) => ({ src: i.src, alt: i.alt }));

  return (
    <section className="section">
      <div className="container">
        {/* Filters */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {galleryCategories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                filter === c
                  ? 'bg-gradient-to-r from-saffron-500 to-gold-500 text-white shadow-gold'
                  : 'bg-white text-royal-900 ring-1 ring-royal-900/10 hover:bg-gold-50',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Masonry via CSS columns */}
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
          {filtered.map((img, i) => (
            <motion.button
              key={img.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: (i % 8) * 0.04 }}
              onClick={() => setActive(i)}
              className="group relative block w-full overflow-hidden rounded-2xl"
              style={{ aspectRatio: `${img.width} / ${img.height}` }}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                loading="lazy"
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-royal-950/70 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="text-sm font-semibold text-white">{img.category}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <Lightbox images={slides} index={active} onClose={() => setActive(null)} onNavigate={setActive} />
    </section>
  );
}
