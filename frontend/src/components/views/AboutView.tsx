'use client';

import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { FaBullseye, FaEye, FaHandHoldingHeart } from 'react-icons/fa';
import { team } from '@/data/content';
import PageHeader from '@/components/shared/PageHeader';
import SectionHeading from '@/components/shared/SectionHeading';
import Reveal from '@/components/shared/Reveal';
import WhyChooseUs from '@/components/home/WhyChooseUs';

export default function AboutView() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('about.title')} />
      <section className="section">
        <div className="container-px grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <span className="section-eyebrow">{t('about.overviewTitle')}</span>
            <h2 className="section-title">{t('brand')}</h2>
            <p className="mt-4 text-gray-600">{t('about.overview')}</p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-primary-50 p-5">
                <FaBullseye className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-heading font-semibold">{t('about.missionTitle')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('about.mission')}</p>
              </div>
              <div className="rounded-2xl bg-secondary/10 p-5">
                <FaEye className="h-6 w-6 text-secondary-600" />
                <h3 className="mt-3 font-heading font-semibold">{t('about.visionTitle')}</h3>
                <p className="mt-1 text-sm text-gray-600">{t('about.vision')}</p>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="relative aspect-[4/3] overflow-hidden rounded-3xl">
            <Image src="https://images.unsplash.com/photo-1609920658906-8223bd289001?auto=format&fit=crop&w=1000&q=70" alt="Temple" fill sizes="50vw" className="object-cover" />
            <div className="absolute bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white/95 p-4 shadow-card">
              <FaHandHoldingHeart className="h-8 w-8 text-primary" />
              <div>
                <p className="font-heading text-xl font-bold text-ink">50,000+</p>
                <p className="text-xs text-gray-500">{t('stats.pilgrims')}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <WhyChooseUs />

      <section className="section">
        <div className="container-px">
          <SectionHeading eyebrow="🙏" title={t('about.teamTitle')} />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.08}>
                <div className="card group text-center">
                  <div className="relative aspect-square overflow-hidden">
                    <Image src={m.avatar} alt={m.name} fill sizes="25vw" className="object-cover transition group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading font-semibold text-ink">{m.name}</h3>
                    <p className="text-sm text-primary">{m.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
