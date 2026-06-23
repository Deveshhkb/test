'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle } from 'react-icons/fi';
import type { EventItem } from '@/types';
import { fadeUp, viewport } from '@/lib/animations';
import EventCard from '@/components/cards/EventCard';
import Countdown from '@/components/ui/Countdown';
import { formatDate, cn } from '@/utils';

const categories = ['All', 'Festival', 'Ceremony', 'Yatra', 'Workshop'];

export default function EventsList({ events }: { events: EventItem[] }) {
  const [filter, setFilter] = useState('All');
  const [registered, setRegistered] = useState(false);

  const filtered = useMemo(
    () => (filter === 'All' ? events : events.filter((e) => e.category === filter)),
    [filter, events],
  );

  const featured = events.find((e) => e.featured) ?? events[0];

  return (
    <section className="section">
      <div className="container">
        {/* Featured event with countdown */}
        {featured && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="mb-14 overflow-hidden rounded-[2rem] bg-royal-950 text-white"
          >
            <div className="grid lg:grid-cols-2">
              <div
                className="relative min-h-[280px] bg-cover bg-center"
                style={{ backgroundImage: `url(${featured.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-royal-950" />
              </div>
              <div className="p-8 md:p-12">
                <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-royal-950">
                  Next Big Event
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold md:text-4xl">{featured.title}</h2>
                <p className="mt-2 text-white/70">
                  {formatDate(featured.date)} · {featured.location}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-white/80">{featured.longDescription}</p>
                <div className="mt-6">
                  <Countdown targetIso={featured.date} light />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Category filters */}
        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                filter === c
                  ? 'bg-gradient-to-r from-saffron-500 to-gold-500 text-white shadow-gold'
                  : 'bg-white text-royal-900 ring-1 ring-royal-900/10 hover:bg-gold-50',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>

        {/* Registration form */}
        <div className="mt-20 grid items-center gap-10 rounded-[2rem] bg-gold-50 p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="font-display text-3xl font-bold text-royal-950">Register for an Event</h2>
            <p className="mt-3 text-royal-900/70">
              Reserve your place at an upcoming festival or ceremony and our team will share all the
              details, timings and special arrangements.
            </p>
          </div>

          {registered ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-glass">
              <FiCheckCircle className="mx-auto text-5xl text-green-500" />
              <p className="mt-3 font-semibold text-royal-950">Registration received!</p>
              <p className="text-sm text-royal-900/60">We will email your confirmation shortly.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRegistered(true);
              }}
              className="grid gap-4 rounded-2xl bg-white p-6 shadow-glass sm:grid-cols-2"
            >
              <input required placeholder="Full name" className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
              <input required type="email" placeholder="Email" className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
              <input required type="tel" placeholder="Phone" className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400" />
              <select className="rounded-xl bg-gold-50 px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10 focus:ring-gold-400">
                {events.map((e) => (
                  <option key={e.id}>{e.title}</option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 py-3.5 font-semibold text-white shadow-gold transition-all hover:shadow-gold-lg sm:col-span-2"
              >
                Register Now
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
