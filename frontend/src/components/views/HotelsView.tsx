'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { FaWifi, FaStar, FaMapMarkerAlt } from 'react-icons/fa';
import { hotels } from '@/data/content';
import { localize, formatINR } from '@/lib/localize';
import PageHeader from '@/components/shared/PageHeader';
import Stars from '@/components/shared/Stars';
import Reveal from '@/components/shared/Reveal';
import EnquiryForm from '@/components/shared/EnquiryForm';

export default function HotelsView() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [maxPrice, setMaxPrice] = useState(6000);
  const [minRating, setMinRating] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(
    () => hotels.filter((h) => h.pricePerNight <= maxPrice && h.rating >= minRating),
    [maxPrice, minRating]
  );

  return (
    <>
      <PageHeader title={t('hotels.title')} subtitle={t('hotels.subtitle')} />
      <section className="section">
        <div className="container-px grid gap-8 lg:grid-cols-4">
          {/* Filters */}
          <aside className="card h-fit p-6 lg:sticky lg:top-24">
            <h3 className="mb-4 font-heading font-semibold">{t('common.filter')}</h3>
            <label className="label">{t('hotels.filterPrice')}: {formatINR(maxPrice)}</label>
            <input type="range" min={1500} max={6000} step={250} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#FF7A00]" />
            <label className="label mt-5">{t('hotels.filterRating')}</label>
            <div className="flex gap-2">
              {[0, 4, 4.5].map((r) => (
                <button key={r} onClick={() => setMinRating(r)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${minRating === r ? 'bg-primary text-white' : 'border border-gray-200'}`}>
                  {r === 0 ? t('common.all') : `${r}+`}
                </button>
              ))}
            </div>
          </aside>

          {/* Listings */}
          <div className="space-y-6 lg:col-span-3">
            {filtered.map((h, i) => (
              <Reveal key={h.slug} delay={i * 0.05}>
                <article className="card flex flex-col sm:flex-row">
                  <div className="relative h-52 sm:h-auto sm:w-72">
                    <Image src={h.coverImage} alt={h.name} fill sizes="(max-width:640px) 100vw, 18rem" className="object-cover" />
                    <span className="absolute left-3 top-3 chip bg-white/90"><FaStar className="mr-1 h-3 w-3 text-secondary" /> {h.starCategory}-Star</span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FaMapMarkerAlt className="h-3 w-3 text-primary" /> {h.address}
                    </div>
                    <h3 className="mt-1 font-heading text-xl font-semibold text-ink">{h.name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <Stars rating={h.rating} /> {h.rating}
                    </div>
                    <p className="mt-2 text-sm text-gray-500">{localize(h.description, lang)}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {h.amenities.map((a) => (
                        <span key={a} className="chip"><FaWifi className="mr-1 h-3 w-3" />{a}</span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-end justify-between pt-4">
                      <div>
                        <span className="text-xl font-bold text-primary">{formatINR(h.pricePerNight)}</span>
                        <span className="text-sm text-gray-400">{t('common.perNight')}</span>
                      </div>
                      <button onClick={() => setSelected(selected === h.slug ? null : h.slug)} className="btn-primary !px-5 !py-2.5">
                        {t('hotels.requestBooking')}
                      </button>
                    </div>
                    {selected === h.slug && (
                      <div className="mt-5 border-t border-gray-100 pt-5">
                        <EnquiryForm source="hotel" subject={`Hotel: ${h.name}`} compact />
                      </div>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
