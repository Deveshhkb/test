import type { Metadata, Viewport } from 'next';
import { Poppins, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { siteConfig } from '@/lib/config';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MobileDrawer from '@/components/layout/MobileDrawer';
import SearchOverlay from '@/components/layout/SearchOverlay';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';
import ScrollToTop from '@/components/layout/ScrollToTop';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: siteConfig.url },
};

export const viewport: Viewport = {
  themeColor: '#141155',
  width: 'device-width',
  initialScale: 1,
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  name: siteConfig.name,
  description: siteConfig.description,
  url: siteConfig.url,
  telephone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: siteConfig.contact.address,
    addressCountry: 'IN',
  },
  sameAs: Object.values(siteConfig.social),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-royal-950 focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SmoothScrollProvider>
          <Navbar />
          <MobileDrawer />
          <SearchOverlay />
          <main id="main">{children}</main>
          <Footer />
          <ScrollToTop />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
