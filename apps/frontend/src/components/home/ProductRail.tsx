'use client';

import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, FreeMode } from 'swiper/modules';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/lib/types';
import 'swiper/css';
import 'swiper/css/navigation';

interface Props {
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
}

export default function ProductRail({ title, subtitle, products, viewAllHref }: Props) {
  if (!products?.length) return null;

  return (
    <section className="container-nova py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-ink/50">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link href={viewAllHref} className="text-sm font-semibold text-nova-600 hover:underline">
            View all →
          </Link>
        )}
      </div>

      <Swiper
        modules={[Navigation, FreeMode]}
        navigation
        freeMode
        spaceBetween={16}
        slidesPerView={2}
        // Whole-number slides per view so cards always fit fully (no cut-off);
        // the count scales up with screen width to use the space dynamically.
        breakpoints={{
          480: { slidesPerView: 2, spaceBetween: 12 },
          640: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
          1536: { slidesPerView: 5 },
          1800: { slidesPerView: 6 },
        }}
        className="!px-1 !pb-2"
      >
        {products.map((p, i) => (
          <SwiperSlide key={p._id}>
            <ProductCard product={p} index={i} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
