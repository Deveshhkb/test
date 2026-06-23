'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Pagination } from 'swiper/modules';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { FiArrowRight, FiPlayCircle } from 'react-icons/fi';
import { ButtonLink } from '@/components/ui/Button';
import Particles from '@/components/ui/Particles';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/pagination';

const slides = [
  {
    image:
      'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=1920&q=80',
    eyebrow: 'Sacred Pilgrimage',
    title: 'Walk the Path of the Divine',
    subtitle: 'Experience the spiritual grandeur of Ayodhya and India’s holiest shrines.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1920&q=80',
    eyebrow: 'The Eternal City',
    title: 'Where Heaven Meets the Ganga',
    subtitle: 'Witness the timeless aarti and the glow of a thousand lamps in Kashi.',
  },
  {
    image:
      'https://images.unsplash.com/photo-1588096344356-9b02fafabb09?auto=format&fit=crop&w=1920&q=80',
    eyebrow: 'Golden Devotion',
    title: 'Serenity Cast in Gold',
    subtitle: 'Find peace in the shimmering reflections of India’s most sacred sanctums.',
  },
];

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-eyebrow', { y: 30, opacity: 0, duration: 0.6 })
        .from('.hero-word', { y: 80, opacity: 0, stagger: 0.12, duration: 0.9 }, '-=0.2')
        .from('.hero-sub', { y: 30, opacity: 0, duration: 0.7 }, '-=0.4')
        .from('.hero-cta', { y: 30, opacity: 0, stagger: 0.1, duration: 0.6 }, '-=0.4');
    },
    { scope: container },
  );

  return (
    <section ref={container} className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      {/* Background slider with parallax wrapper */}
      <div className="absolute inset-0" data-parallax="0.15">
        <Swiper
          modules={[Autoplay, EffectFade, Pagination]}
          effect="fade"
          loop
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          className="h-full w-full"
        >
          {slides.map((slide, i) => (
            <SwiperSlide key={i}>
              <div className="relative h-full w-full">
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="scale-110 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-royal-950/70 via-royal-950/40 to-royal-950/80" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <Particles count={22} color="bg-gold-300/50" />

      {/* Foreground content — pulls copy from the first slide for the reveal */}
      <div className="container relative z-10 flex h-full flex-col items-center justify-center text-center text-white">
        <span className="hero-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-gold-300 backdrop-blur">
          {slides[0].eyebrow}
        </span>
        <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] text-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
          {slides[0].title.split(' ').map((word, i) => (
            <span key={i} className="hero-word mr-3 inline-block">
              {word === 'Divine' || word === 'Path' ? (
                <span className="text-gold-gradient animate-shimmer">{word}</span>
              ) : (
                word
              )}
            </span>
          ))}
        </h1>
        <p className="hero-sub mt-6 max-w-2xl text-base text-white/80 md:text-lg">
          {slides[0].subtitle}
        </p>
        <div className="mt-9 flex flex-col gap-4 sm:flex-row">
          <ButtonLink href="/packages" size="lg" className="hero-cta">
            Explore Yatras <FiArrowRight />
          </ButtonLink>
          <ButtonLink
            href="/videos"
            size="lg"
            variant="outline"
            className="hero-cta border-white/60 text-white hover:bg-white hover:text-royal-950"
          >
            <FiPlayCircle className="text-xl" /> Watch Film
          </ButtonLink>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white/50 p-1.5">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white/80" />
        </div>
      </div>
    </section>
  );
}
