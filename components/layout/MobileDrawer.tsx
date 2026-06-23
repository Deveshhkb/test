'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronDown } from 'react-icons/fi';
import { navLinks, siteConfig } from '@/lib/config';
import { useUIStore } from '@/store/useUIStore';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/utils';

export default function MobileDrawer() {
  const { mobileMenuOpen, closeMobileMenu } = useUIStore();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Close on route change and lock body scroll while open.
  useEffect(() => {
    closeMobileMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 z-[60] bg-royal-950/60 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-[70] flex h-full w-[85%] max-w-sm flex-col bg-gradient-to-b from-white to-gold-50 shadow-2xl lg:hidden"
          >
            <div className="flex items-center justify-between border-b border-gold-100 p-5">
              <span className="font-display text-xl font-bold text-royal-950">Menu</span>
              <button
                onClick={closeMobileMenu}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-full bg-royal-50 text-royal-900"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-5">
              <ul className="space-y-1">
                {navLinks.map((link) => {
                  const hasChildren = !!link.children?.length;
                  const open = expanded === link.label;
                  return (
                    <li key={link.label}>
                      <div className="flex items-center justify-between">
                        <Link
                          href={link.href}
                          className="flex-1 rounded-xl px-4 py-3 text-base font-semibold text-royal-950 transition-colors hover:bg-gold-100"
                        >
                          {link.label}
                        </Link>
                        {hasChildren && (
                          <button
                            onClick={() => setExpanded(open ? null : link.label)}
                            aria-label={`Toggle ${link.label}`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-royal-900"
                          >
                            <FiChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                          </button>
                        )}
                      </div>
                      <AnimatePresence>
                        {hasChildren && open && (
                          <motion.ul
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pl-4"
                          >
                            {link.children!.map((child) => (
                              <li key={child.href + child.label}>
                                <Link
                                  href={child.href}
                                  className="block rounded-lg px-4 py-2.5 text-sm text-royal-900/80 hover:bg-gold-100"
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-gold-100 p-5">
              <ButtonLink href="/packages" className="w-full">
                Plan Your Yatra
              </ButtonLink>
              <p className="mt-4 text-center text-sm text-royal-900/60">{siteConfig.contact.phone}</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
