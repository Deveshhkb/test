'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMapPin } from 'react-icons/fi';
import type { Destination } from '@/types';
import { fadeUp, staggerContainer, viewport } from '@/lib/animations';
import SectionHeading from '@/components/ui/SectionHeading';

export default function Destinations({ destinations }: { destinations: Destination[] }) {
  return (
    <section className="section relative overflow-hidden bg-royal-950 text-white">
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #d4af37 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />
      <div className="container relative">
        <SectionHeading
          light
          eyebrow="Holy Cities"
          title="Popular Spiritual Destinations"
          subtitle="Journey to the sacred cities where faith, history and culture converge."
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {destinations.map((d) => (
            <motion.div key={d.id} variants={fadeUp}>
              <Link
                href={`/temples?search=${encodeURIComponent(d.name)}`}
                className="group relative block h-72 overflow-hidden rounded-3xl"
              >
                <Image
                  src={d.image}
                  alt={d.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-royal-950 via-royal-950/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/90 px-3 py-1 text-xs font-bold text-royal-950">
                    {d.templeCount} Temples
                  </span>
                  <h3 className="mt-3 text-2xl font-bold">{d.name}</h3>
                  <p className="flex items-center gap-1.5 text-sm text-white/70">
                    <FiMapPin /> {d.state}
                  </p>
                  <p className="mt-1 max-h-0 overflow-hidden text-sm text-white/0 transition-all duration-500 group-hover:max-h-16 group-hover:text-white/80">
                    {d.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
