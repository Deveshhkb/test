import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  FiClock,
  FiMapPin,
  FiCalendar,
  FiNavigation,
  FiStar,
} from 'react-icons/fi';
import { GiTempleGate, GiPrayerBeads } from 'react-icons/gi';
import { getTempleBySlug, getAllTempleSlugs } from '@/services/temple.service';
import { formatDate } from '@/utils';
import PageHero from '@/components/ui/PageHero';
import TempleGallery from '@/components/temples/TempleGallery';
import BookingSidebar from '@/components/temples/BookingSidebar';
import Accordion from '@/components/ui/Accordion';
import Rating from '@/components/ui/Rating';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTempleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const temple = await getTempleBySlug(slug);
  if (!temple) return { title: 'Temple Not Found' };

  return {
    title: temple.name,
    description: temple.shortDescription,
    alternates: { canonical: `/temples/${temple.slug}` },
    openGraph: {
      title: temple.name,
      description: temple.shortDescription,
      images: [{ url: temple.image }],
    },
  };
}

export default async function TempleDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const temple = await getTempleBySlug(slug);
  if (!temple) notFound();

  const mapSrc = `https://maps.google.com/maps?q=${temple.location.lat},${temple.location.lng}&z=14&output=embed`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: temple.name,
    description: temple.shortDescription,
    image: temple.image,
    address: {
      '@type': 'PostalAddress',
      streetAddress: temple.location.address,
      addressRegion: temple.state,
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: temple.location.lat,
      longitude: temple.location.lng,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: temple.rating,
      reviewCount: temple.reviewCount,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        title={temple.name}
        subtitle={`${temple.deity} · ${temple.city}, ${temple.state}`}
        image={temple.image}
        crumbs={[{ label: 'Temples', href: '/temples' }, { label: temple.name }]}
      />

      <section className="section">
        <div className="container grid gap-12 lg:grid-cols-[1fr_380px]">
          {/* Main column */}
          <div className="min-w-0 space-y-14">
            {/* Quick facts */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { icon: FiStar, label: 'Rating', value: `${temple.rating} / 5` },
                { icon: GiTempleGate, label: 'Deity', value: temple.deity },
                { icon: GiPrayerBeads, label: 'Category', value: temple.category },
                { icon: FiCalendar, label: 'Established', value: temple.established },
              ].map((f) => (
                <div key={f.label} className="rounded-2xl bg-gold-50 p-4 text-center">
                  <f.icon className="mx-auto text-2xl text-gold-600" />
                  <p className="mt-2 text-xs uppercase tracking-wider text-royal-900/50">{f.label}</p>
                  <p className="text-sm font-bold text-royal-950">{f.value}</p>
                </div>
              ))}
            </div>

            <TempleGallery images={[temple.image, ...temple.gallery]} name={temple.name} />

            <article>
              <h2 className="text-2xl font-bold text-royal-950">About {temple.name}</h2>
              <p className="mt-4 leading-relaxed text-royal-900/75">{temple.description}</p>
            </article>

            <article>
              <h2 className="text-2xl font-bold text-royal-950">Temple History</h2>
              <p className="mt-4 leading-relaxed text-royal-900/75">{temple.history}</p>
            </article>

            {/* Timings */}
            <article>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-royal-950">
                <FiClock className="text-gold-500" /> Temple Timings
              </h2>
              <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-royal-900/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-royal-950 text-white">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Day</th>
                      <th className="px-5 py-3 font-semibold">Morning</th>
                      <th className="px-5 py-3 font-semibold">Evening</th>
                    </tr>
                  </thead>
                  <tbody>
                    {temple.timings.map((t, i) => (
                      <tr key={t.day} className={i % 2 ? 'bg-gold-50' : 'bg-white'}>
                        <td className="px-5 py-3 font-medium text-royal-950">{t.day}</td>
                        <td className="px-5 py-3 text-royal-900/70">{t.morning}</td>
                        <td className="px-5 py-3 text-royal-900/70">{t.evening}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* Location + map */}
            <article>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-royal-950">
                <FiMapPin className="text-gold-500" /> Location
              </h2>
              <p className="mt-3 text-royal-900/70">{temple.location.address}</p>
              <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-royal-900/10">
                <iframe
                  src={mapSrc}
                  title={`Map of ${temple.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-80 w-full border-0"
                />
              </div>
            </article>

            {/* Nearby attractions */}
            <article>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-royal-950">
                <FiNavigation className="text-gold-500" /> Nearby Attractions
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {temple.nearbyAttractions.map((n) => (
                  <div key={n.name} className="rounded-2xl bg-gold-50 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-royal-950">{n.name}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gold-700">
                        {n.distance}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-royal-900/70">{n.description}</p>
                  </div>
                ))}
              </div>
            </article>

            {/* Festivals */}
            <article>
              <h2 className="text-2xl font-bold text-royal-950">Festival Information</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {temple.festivals.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-gradient-to-r from-saffron-100 to-gold-100 px-5 py-2 text-sm font-semibold text-saffron-700"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </article>

            {/* Travel guide */}
            <article>
              <h2 className="text-2xl font-bold text-royal-950">Travel Guide</h2>
              <p className="mt-4 leading-relaxed text-royal-900/75">{temple.travelGuide}</p>
            </article>

            {/* FAQs */}
            <article>
              <h2 className="text-2xl font-bold text-royal-950">Frequently Asked Questions</h2>
              <Accordion items={temple.faqs} className="mt-5" />
            </article>

            {/* Reviews */}
            <article>
              <h2 className="text-2xl font-bold text-royal-950">Visitor Reviews</h2>
              <div className="mt-5 space-y-4">
                {temple.reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-white p-5 shadow-glass ring-1 ring-royal-900/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-saffron-500 to-gold-500 font-bold text-white">
                          {r.author.charAt(0)}
                        </span>
                        <div>
                          <p className="font-semibold text-royal-950">{r.author}</p>
                          <p className="text-xs text-royal-900/50">{formatDate(r.date)}</p>
                        </div>
                      </div>
                      <Rating value={r.rating} />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-royal-900/75">{r.comment}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <BookingSidebar temple={temple} />
        </div>
      </section>
    </>
  );
}
