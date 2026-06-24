'use client';

import { useTranslation } from 'react-i18next';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import { FaQuoteLeft } from 'react-icons/fa';
import { testimonials } from '@/data/content';
import SectionHeading from '@/components/shared/SectionHeading';
import Stars from '@/components/shared/Stars';

import 'swiper/css';
import 'swiper/css/pagination';

export default function Testimonials() {
  const { t } = useTranslation();
  return (
    <section className="section bg-primary-50/40">
      <div className="container-px">
        <SectionHeading
          eyebrow="❝"
          title={t('sections.testimonialsTitle')}
          subtitle={t('sections.testimonialsSubtitle')}
        />
        <div className="mt-12">
          <Swiper
            modules={[Autoplay, Pagination]}
            autoplay={{ delay: 4500 }}
            pagination={{ clickable: true }}
            spaceBetween={24}
            loop
            breakpoints={{ 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }}
            className="!pb-12"
          >
            {testimonials.map((tm, i) => (
              <SwiperSlide key={i} className="h-auto">
                <div className="card h-full p-7">
                  <FaQuoteLeft className="h-7 w-7 text-primary/30" />
                  <p className="mt-4 text-sm leading-relaxed text-gray-600">{tm.message}</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                      {tm.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{tm.name}</p>
                      <p className="text-xs text-gray-400">{tm.location}</p>
                    </div>
                    <div className="ml-auto">
                      <Stars rating={tm.rating} />
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}
