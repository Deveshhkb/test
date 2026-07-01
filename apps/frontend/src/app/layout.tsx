import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/context/Providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import DesktopShell from '@/components/desktop/DesktopShell';
import QuickActions from '@/components/desktop/QuickActions';
import AiLauncher from '@/components/ai/AiLauncher';

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

  // Set the theme class before first paint to prevent a flash of the wrong
  // theme (reads saved choice, falls back to the OS preference).
  const themeScript = `(function(){try{var t=localStorage.getItem('nova-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* suppressHydrationWarning: some browser extensions (Grammarly, password
          managers, etc.) inject attributes into <body> before React hydrates. */}
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Providers>
          <Header />
          <main className="min-h-[60vh]">
            <DesktopShell>{children}</DesktopShell>
          </main>
          <Footer />
          <CartDrawer />
          <QuickActions />
          <AiLauncher />
        </Providers>
      </body>
    </html>
  );
}
