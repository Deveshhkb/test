'use client';

import { useTranslation } from 'react-i18next';
import { FaShieldAlt, FaUserTie, FaHeadset, FaTags } from 'react-icons/fa';
import SectionHeading from '@/components/shared/SectionHeading';
import Reveal from '@/components/shared/Reveal';

const ITEMS = [
  { key: 'trusted', Icon: FaShieldAlt },
  { key: 'guides', Icon: FaUserTie },
  { key: 'support', Icon: FaHeadset },
  { key: 'pricing', Icon: FaTags },
];

export default function WhyChooseUs() {
  const { t } = useTranslation();
  return (
    <section className="section bg-ink text-white">
      <div className="container-px">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow text-secondary">✦</span>
          <h2 className="section-title text-white">{t('sections.whyChooseUsTitle')}</h2>
          <p className="mt-3 text-gray-400">{t('sections.whyChooseUsSubtitle')}</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(({ key, Icon }, i) => (
            <Reveal key={key} delay={i * 0.08}>
              <div className="group h-full rounded-2xl border border-white/10 bg-white/5 p-7 transition hover:border-primary hover:bg-white/10">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 font-heading text-lg font-semibold">{t(`whyChooseUs.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-gray-400">{t(`whyChooseUs.${key}.desc`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
