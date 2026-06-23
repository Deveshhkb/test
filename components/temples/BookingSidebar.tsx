'use client';

import { useState } from 'react';
import { FiCalendar, FiUsers, FiCheckCircle, FiPhone } from 'react-icons/fi';
import type { Temple } from '@/types';
import { siteConfig } from '@/lib/config';

export default function BookingSidebar({ temple }: { temple: Temple }) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="overflow-hidden rounded-3xl bg-white shadow-gold-lg ring-1 ring-royal-900/5">
        <div className="bg-saffron-royal p-6 text-center text-white">
          <p className="text-sm uppercase tracking-wider text-white/80">Book a Guided Darshan</p>
          <p className="mt-1 font-display text-3xl font-bold">From ₹4,999</p>
          <p className="text-xs text-white/70">per devotee · incl. VIP entry</p>
        </div>

        {submitted ? (
          <div className="p-8 text-center">
            <FiCheckCircle className="mx-auto text-5xl text-green-500" />
            <h3 className="mt-4 text-lg font-bold text-royal-950">Request Received</h3>
            <p className="mt-1 text-sm text-royal-900/60">
              Our team will contact you shortly to confirm your darshan at {temple.name}.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
            className="space-y-4 p-6"
          >
            <input
              required
              placeholder="Full name"
              className="w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400"
            />
            <input
              required
              type="tel"
              placeholder="Phone number"
              className="w-full rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400"
            />
            <label className="flex items-center gap-2 rounded-xl bg-gold-50 px-4 py-3 ring-1 ring-royal-900/10">
              <FiCalendar className="text-gold-500" />
              <input required type="date" className="w-full bg-transparent text-sm outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-gold-50 px-4 py-3 ring-1 ring-royal-900/10">
              <FiUsers className="text-gold-500" />
              <select className="w-full bg-transparent text-sm outline-none">
                <option>1 Pilgrim</option>
                <option>2 Pilgrims</option>
                <option>3–5 Pilgrims</option>
                <option>Group (6+)</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 py-3.5 font-semibold text-white shadow-gold transition-all hover:shadow-gold-lg"
            >
              Request Darshan
            </button>
            <a
              href={`tel:${siteConfig.contact.phone.replace(/\s/g, '')}`}
              className="flex items-center justify-center gap-2 text-sm font-medium text-royal-900/70 hover:text-gold-600"
            >
              <FiPhone /> or call {siteConfig.contact.phone}
            </a>
          </form>
        )}
      </div>
    </aside>
  );
}
