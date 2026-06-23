'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle } from 'react-icons/fi';
import type { TourPackage } from '@/types';
import { fadeUp, viewport } from '@/lib/animations';
import PackageCard from '@/components/cards/PackageCard';
import { formatPrice } from '@/utils';

export default function PackagesView({ packages }: { packages: TourPackage[] }) {
  const [selected, setSelected] = useState(packages[0]?.slug ?? '');
  const [booked, setBooked] = useState(false);

  const active = packages.find((p) => p.slug === selected) ?? packages[0];

  return (
    <section className="section">
      <div className="container">
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.id} pkg={pkg} index={i} />
          ))}
        </div>

        {/* Itinerary + booking */}
        {active && (
          <motion.div
            id={`book-${active.slug}`}
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="mt-20 grid gap-10 rounded-[2rem] bg-gold-50 p-6 md:p-10 lg:grid-cols-2"
          >
            {/* Itinerary */}
            <div>
              <h2 className="font-display text-3xl font-bold text-royal-950">Itinerary & Booking</h2>
              <label className="mt-5 block text-sm font-semibold text-royal-900/70">
                Choose a package
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-white px-4 py-3 text-sm font-normal text-royal-950 outline-none ring-1 ring-royal-900/10 focus:ring-gold-400"
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.title} — {formatPrice(p.price)}
                    </option>
                  ))}
                </select>
              </label>

              <ol className="mt-6 space-y-4">
                {active.itinerary.map((step) => (
                  <li key={step.day} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-saffron-500 to-gold-500 text-sm font-bold text-white">
                      {step.day}
                    </span>
                    <div>
                      <h3 className="font-bold text-royal-950">{step.title}</h3>
                      <p className="text-sm text-royal-900/70">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Booking form */}
            <div className="rounded-3xl bg-white p-6 shadow-glass md:p-8">
              {booked ? (
                <div className="py-12 text-center">
                  <FiCheckCircle className="mx-auto text-5xl text-green-500" />
                  <h3 className="mt-4 text-xl font-bold text-royal-950">Booking Requested!</h3>
                  <p className="mt-1 text-sm text-royal-900/60">
                    Thank you for choosing {active.title}. Our team will confirm shortly.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setBooked(true);
                  }}
                  className="space-y-4"
                >
                  <h3 className="text-xl font-bold text-royal-950">Reserve Your Spot</h3>
                  <input required placeholder="Full name" className="w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
                  <input required type="email" placeholder="Email" className="w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
                  <input required type="tel" placeholder="Phone" className="w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
                  <div className="grid grid-cols-2 gap-4">
                    <input required type="date" className="w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
                    <input type="number" min={1} defaultValue={2} placeholder="Travellers" className="w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gold-100 px-4 py-3">
                    <span className="text-sm font-medium text-royal-900/70">Starting from</span>
                    <span className="font-display text-xl font-bold text-saffron-700">
                      {formatPrice(active.price)}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 py-3.5 font-semibold text-white shadow-gold transition-all hover:shadow-gold-lg"
                  >
                    Book {active.title}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
