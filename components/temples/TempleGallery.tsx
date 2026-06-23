'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/utils';
import Lightbox from '@/components/media/Lightbox';

export default function TempleGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState<number | null>(null);
  const slides = images.map((src, i) => ({ src, alt: `${name} photo ${i + 1}` }));

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.slice(0, 4).map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-2xl',
              i === 0 && 'col-span-2 row-span-2 aspect-auto md:h-full',
            )}
          >
            <Image
              src={src}
              alt={`${name} photo ${i + 1}`}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-royal-950/0 transition-colors group-hover:bg-royal-950/20" />
          </button>
        ))}
      </div>

      <Lightbox images={slides} index={active} onClose={() => setActive(null)} onNavigate={setActive} />
    </div>
  );
}
