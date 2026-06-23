'use client';

import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { FaQuoteLeft } from 'react-icons/fa';
import type { Testimonial } from '@/types';
import SectionHeading from '@/components/ui/SectionHeading';
import Rating from '@/components/ui/Rating';

import 'swiper/css';
import 'swiper/css/pagination';

export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section id="testimonials" className="section relative overflow-hidden bg-gradient-to-b from-gold-50 to-white">
      <div className="container">
        <SectionHeading
          eyebrow="Pilgrim Voices"
          title="Loved by Devotees"
          subtitle="Heartfelt words from those who have journeyed with us."
        />

        <Swiper
          modules={[Autoplay, Pagination]}
          autoplay={{ delay: 4500, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          spaceBetween={28}
          breakpoints={{ 0: { slidesPerView: 1 }, 768: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
          className="!pb-14"
        >
          {testimonials.map((t) => (
            <SwiperSlide key={t.id} className="h-auto">
              <figure className="flex h-full flex-col rounded-3xl bg-white p-7 shadow-glass ring-1 ring-royal-900/5">
                <FaQuoteLeft className="text-3xl text-gold-300" />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-royal-900/80">
                  “{t.quote}”
                </blockquote>
                <Rating value={t.rating} className="mt-5" />
                <figcaption className="mt-4 flex items-center gap-3 border-t border-gold-100 pt-4">
                  <Image src={t.avatar} alt={t.name} width={48} height={48} className="rounded-full" />
                  <span>
                    <span className="block font-bold text-royal-950">{t.name}</span>
                    <span className="block text-xs text-royal-900/60">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
