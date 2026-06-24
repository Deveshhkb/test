'use client';

import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { FaClock, FaPrayingHands, FaTshirt, FaMapMarkerAlt } from 'react-icons/fa';
import type { Temple } from '@/lib/types';
import { localize } from '@/lib/localize';
import PageHeader from '@/components/shared/PageHeader';
import Reveal from '@/components/shared/Reveal';

export default function TempleDetail({ temple }: { temple: Temple }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const mapSrc = `https://maps.google.com/maps?q=${temple.location.lat},${temple.location.lng}&z=14&output=embed`;

  const info = [
    { Icon: FaClock, label: t('temples.darshanTimings'), value: temple.darshanTimings },
    { Icon: FaPrayingHands, label: t('temples.aartiTimings'), value: temple.aartiTimings },
    { Icon: FaTshirt, label: t('temples.dressCode'), value: localize(temple.dressCode, lang) },
    { Icon: FaMapMarkerAlt, label: t('temples.location'), value: temple.location.address },
  ];

  return (
    <>
      <PageHeader title={localize(temple.name, lang)} subtitle={temple.destination} image={temple.coverImage} />
      <section className="section">
        <div className="container-px grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <Reveal>
              <h2 className="section-title text-2xl">{t('packages.overview')}</h2>
              <p className="mt-3 text-gray-600">{localize(temple.description, lang)}</p>
            </Reveal>
            <Reveal>
              <h2 className="section-title text-2xl">{t('temples.history')}</h2>
              <p className="mt-3 text-gray-600">{localize(temple.history, lang)}</p>
            </Reveal>

            <Reveal>
              <h2 className="section-title text-2xl">{t('gallery.title')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {temple.gallery.map((g, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                    <Image src={g} alt={`${localize(temple.name, lang)} ${i + 1}`} fill sizes="33vw" className="object-cover transition hover:scale-110" />
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <h2 className="section-title text-2xl">{t('temples.location')}</h2>
              <iframe
                title="map"
                src={mapSrc}
                className="mt-4 h-72 w-full rounded-2xl border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </Reveal>
          </div>

          <aside className="space-y-6">
            <Reveal className="card p-6">
              <h3 className="mb-4 font-heading text-lg font-semibold">Temple Information</h3>
              <ul className="space-y-4">
                {info.map(({ Icon, label, value }) => (
                  <li key={label} className="flex gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-xs font-medium text-gray-400">{label}</p>
                      <p className="text-sm text-ink">{value}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal className="card p-6">
              <h3 className="mb-4 font-heading text-lg font-semibold">{t('temples.nearby')}</h3>
              <ul className="space-y-3">
                {temple.nearbyAttractions.map((n) => (
                  <li key={n.name} className="flex items-center justify-between text-sm">
                    <span className="text-ink">{n.name}</span>
                    <span className="chip">{n.distance}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </aside>
        </div>
      </section>
    </>
  );
}
