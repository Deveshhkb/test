import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/context/Providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'NovaStyle — Original Fashion, Reimagined',
    template: '%s | NovaStyle',
  },
  description:
    'NovaStyle is an original fashion label offering trend-forward apparel, footwear and accessories for men and women. Free shipping over ₹999.',
  keywords: ['fashion', 'clothing', 'apparel', 'streetwear', 'NovaStyle'],
  openGraph: {
    type: 'website',
    title: 'NovaStyle — Original Fashion, Reimagined',
    description: 'Trend-forward apparel, footwear and accessories.',
    url: siteUrl,
    siteName: 'NovaStyle',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NovaStyle',
    url: siteUrl,
    description: 'Original fashion label for men and women.',
  };

  return (
    <html lang="en" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Providers>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
