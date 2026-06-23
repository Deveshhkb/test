'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiSearch, FiMapPin, FiGrid } from 'react-icons/fi';
import { indianStates, templeCategories } from '@/lib/config';
import { fadeUp, viewport } from '@/lib/animations';

export default function QuickSearch() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('All');
  const [category, setCategory] = useState('All');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (state !== 'All') params.set('state', state);
    if (category !== 'All') params.set('category', category);
    router.push(`/temples?${params.toString()}`);
  };

  return (
    <section className="relative z-20 -mt-20 px-4">
      <motion.form
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
        onSubmit={submit}
        className="glass mx-auto grid max-w-5xl gap-3 rounded-3xl p-4 shadow-gold-lg md:grid-cols-[1fr_auto] md:items-end md:gap-4"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-royal-900/60">Search</span>
            <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-royal-900/10">
              <FiSearch className="text-gold-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Temple or deity"
                className="w-full bg-transparent text-sm outline-none"
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-royal-900/60">State</span>
            <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-royal-900/10">
              <FiMapPin className="text-gold-500" />
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              >
                {indianStates.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-royal-900/60">Category</span>
            <span className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 ring-1 ring-royal-900/10">
              <FiGrid className="text-gold-500" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              >
                {templeCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-saffron-500 to-gold-500 px-8 py-3.5 font-semibold text-white shadow-gold transition-all hover:shadow-gold-lg md:h-[46px]"
        >
          <FiSearch /> Search
        </button>
      </motion.form>
    </section>
  );
}
