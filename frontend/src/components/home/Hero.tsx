'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import { FaSearch, FaPlayCircle } from 'react-icons/fa';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

const SLIDES = [
  'https://images.unsplash.com/photo-1609920658906-8223bd289001?auto=format&fit=crop&w=1920&q=75',
  'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1920&q=75',
  'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1920&q=75',
];

export default function Hero() {
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);

  // GSAP staggered text reveal on mount.
  useGSAP(
    () => {
      gsap.from('.hero-anim', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: 'power3.out',
      });
    },
    { scope: container }
  );

  return (
    <section
      ref={container}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-gradient-to-br from-[#2a1500] via-primary-700 to-primary"
    >
      {/* Background slider with smooth Ken Burns parallax.
          The section keeps a gradient background so the hero stays legible even
          if the remote images are slow or blocked. */}
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        effect="fade"
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop
        pagination={{ clickable: true }}
        className="absolute inset-0 h-full w-full"
      >
        {SLIDES.map((src, i) => (
          <SwiperSlide key={i}>
            <div className="relative h-full w-full">
              <Image src={src} alt="Sacred temple" fill priority={i === 0} sizes="100vw" className="animate-[float_18s_ease-in-out_infinite] object-cover" />
              <div className="absolute inset-0 bg-hero-gradient" />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="container-px relative z-10 text-center text-white">
        <span className="hero-anim chip mb-4 bg-white/15 text-white">🕉 {t('tagline')}</span>
        <h1 className="hero-anim mx-auto max-w-4xl text-4xl font-bold leading-tight sm:text-6xl lg:text-7xl">
          {t('hero.title')}
        </h1>
        <p className="hero-anim mx-auto mt-5 max-w-2xl text-lg text-white/85">{t('hero.subtitle')}</p>

        {/* Search bar */}
        <form
          onSubmit={(e) => e.preventDefault()}
          className="hero-anim mx-auto mt-8 flex w-full max-w-2xl items-center gap-2 rounded-full bg-white/95 p-2 shadow-glow backdrop-blur"
        >
          <FaSearch className="ml-3 h-4 w-4 shrink-0 text-gray-400" />
          <input
            className="w-full bg-transparent px-2 py-2 text-sm text-ink outline-none"
            placeholder={t('hero.searchPlaceholder')}
            aria-label={t('hero.searchPlaceholder')}
          />
          <button className="btn-primary shrink-0 !px-6">{t('search.button')}</button>
        </form>

        <div className="hero-anim mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/packages" className="btn-primary !px-8 !py-3.5">{t('hero.ctaPrimary')}</Link>
          <Link href="/contact" className="btn-outline !px-8 !py-3.5">
            <FaPlayCircle className="h-5 w-5" /> {t('hero.ctaSecondary')}
          </Link>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <div className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-white/60 p-1.5">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white" />
        </div>
      </div>
    </section>
  );
}
