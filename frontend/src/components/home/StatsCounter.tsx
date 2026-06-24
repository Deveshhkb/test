'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { stats } from '@/data/content';

gsap.registerPlugin(ScrollTrigger);

export default function StatsCounter() {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);

  // GSAP counter animation triggered when the section scrolls into view.
  useGSAP(
    () => {
      const els = gsap.utils.toArray<HTMLElement>('.stat-number');
      els.forEach((el) => {
        const end = Number(el.dataset.value);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: end,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          onUpdate: () => {
            el.textContent = Math.floor(obj.val).toLocaleString('en-IN');
          },
        });
      });
    },
    { scope: root }
  );

  return (
    <section ref={root} className="bg-gradient-to-r from-primary to-primary-700 py-16 text-white">
      <div className="container-px">
        <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">{t('sections.statsTitle')}</h2>
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.key} className="text-center">
              <div className="flex items-center justify-center font-heading text-4xl font-bold sm:text-5xl">
                <span className="stat-number" data-value={s.value}>0</span>
                <span>{s.suffix}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-white/85">{t(`stats.${s.key}`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
