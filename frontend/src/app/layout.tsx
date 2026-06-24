import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

import I18nProvider from '@/components/providers/I18nProvider';
import { AuthProvider } from '@/lib/auth';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FloatingContact from '@/components/layout/FloatingContact';
import { buildMetadata, organizationJsonLd } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = buildMetadata({
  title: 'Ayodhya Tirtham — Book Your Spiritual Journey',
  description:
    'Premium pilgrimage tours to Ayodhya, Varanasi, Prayagraj and more. Book Ayodhya darshan packages, hotels and cabs. Ram Mandir tour specialists.',
});

export const viewport: Viewport = {
  themeColor: '#FF7A00',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      {/* suppressHydrationWarning ignores attributes injected by browser
          extensions (e.g. bis_skin_checked from Bitdefender) on the body. */}
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <I18nProvider>
          <AuthProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <FloatingContact />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
