'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { FaBars, FaTimes, FaOm, FaUserCircle } from 'react-icons/fa';
import LanguageSelector from './LanguageSelector';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/', key: 'home' },
  { href: '/destinations', key: 'destinations' },
  { href: '/temples', key: 'temples' },
  { href: '/packages', key: 'packages' },
  { href: '/hotels', key: 'hotels' },
  { href: '/cabs', key: 'cabs' },
  { href: '/gallery', key: 'gallery' },
  { href: '/blog', key: 'blog' },
  { href: '/about', key: 'about' },
  { href: '/contact', key: 'contact' },
] as const;

export default function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Transparent over the homepage hero, solid once scrolled or on inner pages.
  const isHome = pathname === '/';
  const solid = scrolled || !isHome || open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? 'bg-white/95 shadow-sm backdrop-blur' : 'bg-transparent'
      }`}
    >
      <nav className="container-px flex h-16 items-center justify-between lg:h-20">
        <Link href="/" className="flex items-center gap-2">
          <FaOm className={`h-7 w-7 ${solid ? 'text-primary' : 'text-white'}`} />
          <span className={`font-heading text-lg font-bold ${solid ? 'text-ink' : 'text-white'}`}>
            {t('brand')}
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 xl:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    active ? 'text-primary' : solid ? 'text-gray-700 hover:text-primary' : 'text-white/90 hover:text-white'
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <LanguageSelector light={!solid} />

          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                href={user.role === 'admin' ? '/admin' : '/dashboard'}
                className={`flex items-center gap-1.5 text-sm font-medium ${solid ? 'text-ink' : 'text-white'}`}
              >
                <FaUserCircle className="h-5 w-5" /> {user.name.split(' ')[0]}
              </Link>
              <button onClick={logout} className="text-sm text-gray-400 hover:text-primary">
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className={`text-sm font-medium ${solid ? 'text-ink hover:text-primary' : 'text-white'}`}>
                {t('nav.login')}
              </Link>
              <Link href="/register" className="btn-primary !px-4 !py-2">
                {t('nav.register')}
              </Link>
            </div>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            className={`xl:hidden ${solid ? 'text-ink' : 'text-white'}`}
            aria-label="Toggle menu"
          >
            {open ? <FaTimes className="h-6 w-6" /> : <FaBars className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-100 bg-white xl:hidden">
          <ul className="container-px flex flex-col py-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    pathname === item.href ? 'bg-primary-50 text-primary' : 'text-gray-700'
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
            <li className="mt-2 flex gap-2 px-3">
              {user ? (
                <>
                  <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn-ghost flex-1">
                    {t('nav.dashboard')}
                  </Link>
                  <button onClick={logout} className="btn-ghost flex-1">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-ghost flex-1">
                    {t('nav.login')}
                  </Link>
                  <Link href="/register" className="btn-primary flex-1">
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
