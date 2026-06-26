'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import { motion } from 'framer-motion';
import type { Banner } from '@/lib/types';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

const FALLBACK: Banner[] = [
  {
    _id: 'f1',
    title: 'The Summer Edit',
    subtitle: 'Up to 50% off new-season styles',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=70',
    ctaText: 'Shop New In',
    link: '/collections/new-arrivals',
    placement: 'hero',
  },
  {
    _id: 'f2',
    title: 'Street Staples',
    subtitle: 'Hoodies, tees & everyday essentials',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=70',
    ctaText: 'Shop Men',
    link: '/men',
    placement: 'hero',
  },
];

export default function HeroSlider({ banners }: { banners: Banner[] }) {
  const slides = banners.length ? banners : FALLBACK;

  return (
    <section className="container-nova pt-6">
      <Swiper
        modules={[Autoplay, Pagination, EffectFade]}
        effect="fade"
        autoplay={{ delay: 4500, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        loop
        className="overflow-hidden rounded-3xl"
      >
        {slides.map((b) => (
          <SwiperSlide key={b._id}>
            <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
              <Image src={b.image} alt={b.title} fill priority className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container-nova">
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="max-w-xl text-white"
                  >
                    <p className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                      New Collection
                    </p>
                    <h1 className="text-4xl font-black leading-tight sm:text-6xl">{b.title}</h1>
                    <p className="mt-3 text-base text-white/80 sm:text-lg">{b.subtitle}</p>
                    <Link href={b.link || '/'} className="btn-accent mt-6">
                      {b.ctaText || 'Shop Now'}
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
