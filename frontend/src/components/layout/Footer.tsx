'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaOm, FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  const quickLinks = [
    { href: '/destinations', key: 'destinations' },
    { href: '/packages', key: 'packages' },
    { href: '/temples', key: 'temples' },
    { href: '/blog', key: 'blog' },
  ] as const;

  const support = [
    { href: '/about', key: 'about' },
    { href: '/contact', key: 'contact' },
    { href: '/hotels', key: 'hotels' },
    { href: '/cabs', key: 'cabs' },
  ] as const;

  return (
    <footer className="bg-ink text-gray-300">
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2 text-white">
            <FaOm className="h-7 w-7 text-primary" />
            <span className="font-heading text-lg font-bold">{t('brand')}</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">{t('footer.about')}</p>
          <div className="mt-5 flex gap-3">
            {[FaFacebookF, FaInstagram, FaYoutube, FaWhatsapp].map((Icon, i) => (
              <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-primary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
            {t('footer.quickLinks')}
          </h4>
          <ul className="space-y-2.5 text-sm">
            {quickLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-gray-400 transition hover:text-primary">
                  {t(`nav.${l.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
            {t('footer.support')}
          </h4>
          <ul className="space-y-2.5 text-sm">
            {support.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-gray-400 transition hover:text-primary">
                  {t(`nav.${l.key}`)}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-5 space-y-2.5 text-sm text-gray-400">
            <li className="flex items-center gap-2"><FaPhoneAlt className="h-3.5 w-3.5 text-primary" /> +91-99999-99999</li>
            <li className="flex items-center gap-2"><FaEnvelope className="h-3.5 w-3.5 text-primary" /> info@ayodhyatirtham.com</li>
            <li className="flex items-start gap-2"><FaMapMarkerAlt className="mt-0.5 h-3.5 w-3.5 text-primary" /> Ram Path, Ayodhya, UP 224123</li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wider text-white">
            {t('footer.newsletter')}
          </h4>
          <p className="text-sm text-gray-400">{t('footer.newsletterText')}</p>
          <form className="mt-4 flex" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="you@email.com" className="w-full rounded-l-full bg-white/10 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none" />
            <button className="rounded-r-full bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-600">
              {t('footer.subscribe')}
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-px flex flex-col items-center justify-between gap-3 py-5 text-sm text-gray-500 sm:flex-row">
          <p>© {year} {t('brand')}. {t('footer.rights')}</p>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-primary">{t('footer.privacy')}</Link>
            <Link href="#" className="hover:text-primary">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
