'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiMapPin } from 'react-icons/fi';
import { useUIStore } from '@/store/useUIStore';
import { temples } from '@/lib/data/temples';
import { blogPosts } from '@/lib/data/blog';
import { events } from '@/lib/data/events';
import { packages } from '@/lib/data/packages';

type Result = { type: string; label: string; href: string; meta?: string };

// Flatten all searchable content into a single index for the global search.
const buildIndex = (): Result[] => [
  ...temples.map((t) => ({ type: 'Temple', label: t.name, href: `/temples/${t.slug}`, meta: t.city })),
  ...events.map((e) => ({ type: 'Event', label: e.title, href: `/events#${e.slug}`, meta: e.location })),
  ...packages.map((p) => ({ type: 'Package', label: p.title, href: `/packages#${p.slug}`, meta: p.duration })),
  ...blogPosts.map((b) => ({ type: 'Blog', label: b.title, href: `/blog/${b.slug}`, meta: b.category })),
];

export default function SearchOverlay() {
  const { searchOpen, closeSearch } = useUIStore();
  const [query, setQuery] = useState('');
  const index = useMemo(buildIndex, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index
      .filter((r) => r.label.toLowerCase().includes(q) || r.meta?.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSearch();
    if (searchOpen) {
      window.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [searchOpen, closeSearch]);

  useEffect(() => {
    if (!searchOpen) setQuery('');
  }, [searchOpen]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-royal-950/70 p-4 pt-24 backdrop-blur-md"
          onClick={closeSearch}
        >
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-gold-100 px-5 py-4">
              <FiSearch className="text-xl text-gold-500" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search temples, events, packages, articles…"
                className="flex-1 bg-transparent text-lg text-royal-950 outline-none placeholder:text-royal-900/40"
              />
              <button onClick={closeSearch} aria-label="Close search" className="text-royal-900/50 hover:text-royal-900">
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-3">
              {query && results.length === 0 && (
                <p className="px-4 py-10 text-center text-royal-900/50">No results for “{query}”.</p>
              )}
              {!query && (
                <p className="px-4 py-10 text-center text-royal-900/40">
                  Start typing to search across the entire portal.
                </p>
              )}
              {results.map((r) => (
                <Link
                  key={r.href + r.label}
                  href={r.href}
                  onClick={closeSearch}
                  className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-gold-50"
                >
                  <span className="flex items-center gap-3">
                    <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gold-700">
                      {r.type}
                    </span>
                    <span className="font-semibold text-royal-950">{r.label}</span>
                  </span>
                  {r.meta && (
                    <span className="flex items-center gap-1 text-xs text-royal-900/50">
                      <FiMapPin /> {r.meta}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
