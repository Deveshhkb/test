'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const pics = images.length ? images : ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=70'];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  };

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      {/* Thumbnails */}
      <div className="flex gap-3 sm:flex-col">
        {pics.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={cn(
              'relative h-16 w-14 overflow-hidden rounded-lg border-2 sm:h-20 sm:w-16',
              active === i ? 'border-ink' : 'border-transparent opacity-70'
            )}
          >
            <Image src={src} alt={`${title} ${i + 1}`} fill className="object-cover" sizes="64px" />
          </button>
        ))}
      </div>

      {/* Main image with hover zoom */}
      <div
        ref={ref}
        onMouseEnter={() => setZoom(true)}
        onMouseLeave={() => setZoom(false)}
        onMouseMove={onMove}
        className="relative aspect-[3/4] flex-1 cursor-zoom-in overflow-hidden rounded-2xl bg-ink/5"
      >
        <Image
          src={pics[active]}
          alt={title}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className={cn('object-cover transition-transform duration-200', zoom && 'scale-[1.8]')}
          style={zoom ? { transformOrigin: `${pos.x}% ${pos.y}%` } : undefined}
        />
      </div>
    </div>
  );
}
