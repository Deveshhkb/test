'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { FaCheck, FaTimes, FaChevronDown, FaHotel, FaCar, FaClock, FaStar } from 'react-icons/fa';
import type { TourPackage } from '@/lib/types';
import { localize, formatINR } from '@/lib/localize';
import PageHeader from '@/components/shared/PageHeader';
import Reveal from '@/components/shared/Reveal';
import EnquiryForm from '@/components/shared/EnquiryForm';

export default function PackageDetail({ pkg }: { pkg: TourPackage }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const price = pkg.discountPrice ?? pkg.price;

  return (
    <>
      <PageHeader title={localize(pkg.title, lang)} subtitle={pkg.destinations.join(' • ')} image={pkg.coverImage} />

      <section className="section">
        <div className="container-px grid gap-10 lg:grid-cols-3">
          <div className="space-y-12 lg:col-span-2">
            {/* Quick facts */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { Icon: FaClock, label: `${pkg.durationDays} ${t('common.days')} / ${pkg.durationNights} ${t('common.nights')}` },
                { Icon: FaStar, label: `${pkg.rating} (${pkg.reviewsCount})` },
                { Icon: FaHotel, label: pkg.destinations.length > 1 ? `${pkg.destinations.length} Cities` : '1 City' },
              ].map(({ Icon, label }, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 rounded-xl bg-primary-50 p-4 text-center">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium text-ink">{label}</span>
                </div>
              ))}
            </div>

            <Reveal>
              <h2 className="section-title text-2xl">{t('packages.overview')}</h2>
              <p className="mt-3 text-gray-600">{localize(pkg.description, lang)}</p>
            </Reveal>

            {/* Itinerary */}
            <Reveal>
              <h2 className="section-title text-2xl">{t('packages.itinerary')}</h2>
              <div className="mt-5 space-y-4 border-l-2 border-primary/20 pl-6">
                {pkg.itinerary.map((d) => (
                  <div key={d.day} className="relative">
                    <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {d.day}
                    </span>
                    <h3 className="font-heading font-semibold text-ink">
                      {t('packages.day')} {d.day}: {localize(d.title, lang)}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{localize(d.description, lang)}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* Inclusions / Exclusions */}
            <Reveal className="grid gap-6 sm:grid-cols-2">
              <div className="card p-6">
                <h3 className="mb-4 font-heading font-semibold text-green-600">{t('packages.inclusions')}</h3>
                <ul className="space-y-2.5">
                  {pkg.inclusions.map((x) => (
                    <li key={x} className="flex items-start gap-2 text-sm text-gray-600">
                      <FaCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" /> {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-6">
                <h3 className="mb-4 font-heading font-semibold text-red-500">{t('packages.exclusions')}</h3>
                <ul className="space-y-2.5">
                  {pkg.exclusions.map((x) => (
                    <li key={x} className="flex items-start gap-2 text-sm text-gray-600">
                      <FaTimes className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" /> {x}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Hotel & Vehicle */}
            <Reveal className="grid gap-6 sm:grid-cols-2">
              <div className="flex gap-3 rounded-xl bg-gray-50 p-5">
                <FaHotel className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h4 className="font-semibold text-ink">{t('packages.hotelInfo')}</h4>
                  <p className="mt-1 text-sm text-gray-600">{localize(pkg.hotelInfo, lang)}</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-xl bg-gray-50 p-5">
                <FaCar className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h4 className="font-semibold text-ink">{t('packages.vehicleInfo')}</h4>
                  <p className="mt-1 text-sm text-gray-600">{localize(pkg.vehicleInfo, lang)}</p>
                </div>
              </div>
            </Reveal>

            {/* Gallery */}
            <Reveal>
              <h2 className="section-title text-2xl">{t('gallery.title')}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {pkg.gallery.map((g, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                    <Image src={g} alt={`gallery ${i + 1}`} fill sizes="33vw" className="object-cover transition hover:scale-110" />
                  </div>
                ))}
              </div>
            </Reveal>

            {/* FAQ */}
            {pkg.faq.length > 0 && (
              <Reveal>
                <h2 className="section-title text-2xl">{t('packages.faq')}</h2>
                <div className="mt-4 space-y-3">
                  {pkg.faq.map((f, i) => (
                    <div key={i} className="card overflow-hidden">
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full items-center justify-between p-5 text-left font-medium text-ink"
                      >
                        {localize(f.question, lang)}
                        <FaChevronDown className={`h-4 w-4 text-primary transition ${openFaq === i ? 'rotate-180' : ''}`} />
                      </button>
                      {openFaq === i && <p className="px-5 pb-5 text-sm text-gray-600">{localize(f.answer, lang)}</p>}
                    </div>
                  ))}
                </div>
              </Reveal>
            )}
          </div>

          {/* Sticky enquiry sidebar */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <div className="card p-6">
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{formatINR(price)}</span>
                {pkg.discountPrice && <span className="text-gray-400 line-through">{formatINR(pkg.price)}</span>}
                <span className="text-sm text-gray-400">{t('common.perPerson')}</span>
              </div>
              <h3 className="mb-4 font-heading text-lg font-semibold">{t('packages.enquiryForm')}</h3>
              <EnquiryForm source="package" subject={`Package: ${localize(pkg.title, 'en')}`} compact />
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
