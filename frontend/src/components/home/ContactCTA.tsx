'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import Reveal from '@/components/shared/Reveal';

export default function ContactCTA() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden py-20">
      <Image
        src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1920&q=70"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-hero-gradient" />
      <Reveal className="container-px relative z-10 text-center text-white">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">{t('sections.contactCtaTitle')}</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/85">{t('sections.contactCtaSubtitle')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/contact" className="btn-primary !px-8 !py-3.5">{t('sections.contactCtaButton')}</Link>
          <Link href="/packages" className="btn-outline !px-8 !py-3.5">{t('hero.ctaPrimary')}</Link>
        </div>
      </Reveal>
    </section>
  );
}
