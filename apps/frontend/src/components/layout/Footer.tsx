'use client';

import Link from 'next/link';
import Newsletter from './Newsletter';
import { useT } from '@/context/LocaleContext';

// Column definitions reference translation keys instead of literal text.
const COLUMNS = [
  {
    titleKey: 'footer.shop',
    links: [
      { key: 'nav.men', href: '/men' },
      { key: 'nav.women', href: '/women' },
      { key: 'nav.footwear', href: '/footwear' },
      { key: 'nav.accessories', href: '/accessories' },
      { key: 'nav.newArrivals', href: '/collections/new-arrivals' },
    ],
  },
  {
    titleKey: 'footer.help',
    links: [
      { key: 'footer.trackOrder', href: '/account/orders' },
      { key: 'footer.shippingReturns', href: '/page/shipping-returns' },
      { key: 'footer.faqs', href: '/page/shipping-returns' },
      { key: 'footer.contact', href: '/page/about' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { key: 'footer.about', href: '/page/about' },
      { key: 'footer.privacy', href: '/page/privacy' },
      { key: 'footer.terms', href: '/page/terms' },
    ],
  },
];

export default function Footer() {
  const t = useT();

  return (
    <footer className="mt-20 border-t border-ink/10 bg-ink text-white">
      <div className="container-nova grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <span className="text-2xl font-black">
            Nova<span className="text-nova-400">Style</span>
          </span>
          <p className="mt-3 max-w-sm text-sm text-white/60">{t('footer.tagline')}</p>
          <Newsletter />
        </div>

        {COLUMNS.map((col) => (
          <div key={col.titleKey}>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white/80">
              {t(col.titleKey)}
            </h4>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.key}>
                  <Link href={l.href} className="text-sm text-white/55 transition hover:text-white">
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-nova flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} NovaStyle. {t('footer.rights')}</p>
          <p>{t('footer.securePayments')}</p>
        </div>
      </div>
    </footer>
  );
}
