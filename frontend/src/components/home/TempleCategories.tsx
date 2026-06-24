'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { GiLotus, GiTempleGate, GiPrayer } from 'react-icons/gi';
import { FaOm, FaCrown, FaHandsHelping } from 'react-icons/fa';
import SectionHeading from '@/components/shared/SectionHeading';
import Reveal from '@/components/shared/Reveal';

const CATEGORIES = [
  { key: 'Ram Temple', label: 'Ram Temples', Icon: FaCrown },
  { key: 'Shiva Temple', label: 'Shiva Temples', Icon: FaOm },
  { key: 'Krishna Temple', label: 'Krishna Temples', Icon: GiLotus },
  { key: 'Devi Temple', label: 'Devi Temples', Icon: GiPrayer },
  { key: 'Hanuman Temple', label: 'Hanuman Temples', Icon: FaHandsHelping },
  { key: 'Other', label: 'Ghats & Tirthas', Icon: GiTempleGate },
];

export default function TempleCategories() {
  const { t } = useTranslation();
  return (
    <section className="section">
      <div className="container-px">
        <SectionHeading
          eyebrow="🪔"
          title={t('sections.templeCategoriesTitle')}
          subtitle={t('sections.templeCategoriesSubtitle')}
        />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map(({ key, label, Icon }, i) => (
            <Reveal key={key} delay={i * 0.06}>
              <Link
                href={`/temples?category=${encodeURIComponent(key)}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-primary hover:shadow-card"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary transition group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-7 w-7" />
                </span>
                <span className="text-sm font-medium text-ink">{label}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
