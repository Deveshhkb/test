'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiSearch, FiMenu, FiChevronDown } from 'react-icons/fi';
import { navLinks } from '@/lib/config';
import { useUIStore } from '@/store/useUIStore';
import { cn } from '@/utils';
import { ButtonLink } from '@/components/ui/Button';
import Logo from './Logo';

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const { openMobileMenu, openSearch } = useUIStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.split('?')[0]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled ? 'glass py-2 shadow-glass' : 'bg-transparent py-4',
      )}
    >
      <nav className="container flex items-center justify-between gap-4">
        <Logo dark={scrolled} />

        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <li key={link.label} className="group relative">
              <Link
                href={link.href}
                className={cn(
                  'flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  scrolled ? 'text-royal-900' : 'text-white text-shadow-lg',
                  isActive(link.href) && 'text-gold-600',
                )}
              >
                {link.label}
                {link.children && <FiChevronDown className="transition-transform group-hover:rotate-180" />}
              </Link>

              {link.children && (
                <div className="invisible absolute left-1/2 top-full w-72 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <div className="glass overflow-hidden rounded-2xl p-2">
                    {link.children.map((child) => (
                      <Link
                        key={child.href + child.label}
                        href={child.href}
                        className="block rounded-xl px-4 py-3 transition-colors hover:bg-gold-100/70"
                      >
                        <span className="block text-sm font-semibold text-royal-950">{child.label}</span>
                        {child.description && (
                          <span className="block text-xs text-royal-900/60">{child.description}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <button
            onClick={openSearch}
            aria-label="Open search"
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full transition-colors',
              scrolled ? 'bg-royal-50 text-royal-900 hover:bg-gold-100' : 'bg-white/15 text-white hover:bg-white/25',
            )}
          >
            <FiSearch />
          </button>

          <ButtonLink href="/packages" size="sm" className="hidden sm:inline-flex">
            Plan Yatra
          </ButtonLink>

          <button
            onClick={openMobileMenu}
            aria-label="Open menu"
            className={cn(
              'grid h-10 w-10 place-items-center rounded-full transition-colors lg:hidden',
              scrolled ? 'bg-royal-50 text-royal-900' : 'bg-white/15 text-white',
            )}
          >
            <FiMenu />
          </button>
        </div>
      </nav>
    </header>
  );
}
