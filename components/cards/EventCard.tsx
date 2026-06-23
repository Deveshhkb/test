'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiMapPin, FiCalendar } from 'react-icons/fi';
import type { EventItem } from '@/types';
import { fadeUp } from '@/lib/animations';
import { formatDate } from '@/utils';
import Countdown from '@/components/ui/Countdown';

export default function EventCard({ event, index = 0 }: { event: EventItem; index?: number }) {
  const day = new Date(event.date).getDate();
  const month = new Date(event.date).toLocaleString('en-IN', { month: 'short' });

  return (
    <motion.article
      id={event.slug}
      variants={fadeUp}
      custom={index % 3}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="group overflow-hidden rounded-3xl bg-white shadow-glass ring-1 ring-royal-900/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-gold-lg"
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute left-4 top-4 grid h-16 w-16 place-items-center rounded-2xl bg-white/95 text-center shadow-md">
          <span className="text-2xl font-bold leading-none text-saffron-600">{day}</span>
          <span className="text-xs font-semibold uppercase text-royal-900/60">{month}</span>
        </div>
        <span className="absolute right-4 top-4 rounded-full bg-royal-950/70 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {event.category}
        </span>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-royal-950">{event.title}</h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-royal-900/60">
          <span className="flex items-center gap-1.5">
            <FiCalendar className="text-gold-500" /> {formatDate(event.date)}
          </span>
          <span className="flex items-center gap-1.5">
            <FiMapPin className="text-gold-500" /> {event.location}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-royal-900/70">{event.description}</p>
        <div className="mt-5">
          <Countdown targetIso={event.date} compact />
        </div>
      </div>
    </motion.article>
  );
}
