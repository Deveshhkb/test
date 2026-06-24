import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.ayodhyatirtham.com';
const SITE_NAME = 'Ayodhya Tirtham';
const DEFAULT_OG = `${SITE_URL}/og-image.jpg`;

interface SeoOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
}

/**
 * Build consistent Next.js metadata with Open Graph, Twitter cards,
 * canonical URLs and keyword targeting.
 */
export function buildMetadata({ title, description, path = '/', image, keywords = [] }: SeoOptions): Metadata {
  const url = `${SITE_URL}${path}`;
  const fullTitle = path === '/' ? title : `${title} | ${SITE_NAME}`;
  const baseKeywords = [
    'Ayodhya Tour Packages',
    'Ayodhya Darshan',
    'Ram Mandir Tour',
    'Ayodhya Hotels',
    'Ayodhya Cab Booking',
  ];

  return {
    title: fullTitle,
    description,
    keywords: [...baseKeywords, ...keywords],
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      url,
      images: [{ url: image || DEFAULT_OG, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image || DEFAULT_OG],
    },
    robots: { index: true, follow: true },
  };
}

/** JSON-LD structured data for the organization (rendered in the root layout). */
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: SITE_NAME,
  url: SITE_URL,
  description: 'Premium pilgrimage and tourism platform for Ayodhya, Varanasi, Prayagraj and more.',
  areaServed: 'IN',
  knowsLanguage: ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn'],
};

export { SITE_URL, SITE_NAME };
