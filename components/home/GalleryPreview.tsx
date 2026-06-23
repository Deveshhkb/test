'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import type { GalleryImage } from '@/types';
import { fadeUp, staggerContainer, viewport } from '@/lib/animations';
import SectionHeading from '@/components/ui/SectionHeading';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/utils';

// Bento-style layout: the first tile spans 2x2 for visual rhythm.
const spans = [
  'sm:col-span-2 sm:row-span-2',
  '',
  '',
  '',
  'sm:col-span-2',
  '',
];

export default function GalleryPreview({ images }: { images: GalleryImage[] }) {
  const tiles = images.slice(0, 6);

  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Moments of Devotion"
          title="Photo Gallery"
          subtitle="A glimpse into the colour, light and serenity of sacred India."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="grid auto-rows-[180px] grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {tiles.map((img, i) => (
            <motion.div
              key={img.id}
              variants={fadeUp}
              className={cn('group relative overflow-hidden rounded-2xl', spans[i])}
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-royal-950/0 transition-colors group-hover:bg-royal-950/30" />
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 text-center">
          <ButtonLink href="/gallery" variant="outline" size="lg">
            View Full Gallery
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
