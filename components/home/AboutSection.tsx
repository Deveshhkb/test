'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { GiLotusFlower, GiTempleGate, GiPrayerBeads } from 'react-icons/gi';
import { fadeUp, slideInLeft, staggerContainer, viewport } from '@/lib/animations';
import { ButtonLink } from '@/components/ui/Button';
import SectionHeading from '@/components/ui/SectionHeading';

const pillars = [
  { icon: GiTempleGate, title: 'Sacred Heritage', text: 'Curated access to India’s most revered temples and shrines.' },
  { icon: GiPrayerBeads, title: 'Guided Devotion', text: 'Expert pandits and guides for authentic rituals and darshan.' },
  { icon: GiLotusFlower, title: 'Soulful Comfort', text: 'Premium stays and seamless travel so you can focus within.' },
];

export default function AboutSection() {
  return (
    <section className="section relative overflow-hidden bg-gradient-to-b from-white to-gold-50">
      <div className="container grid items-center gap-12 lg:grid-cols-2">
        <motion.div
          variants={slideInLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-gold-lg">
            <Image
              src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=900&q=80"
              alt="Devotee at a sacred temple"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -right-2 hidden rounded-2xl bg-royal-950 p-6 text-white shadow-2xl sm:block md:-right-6">
            <p className="font-display text-4xl font-bold text-gold-400">18+</p>
            <p className="text-sm text-white/70">Years guiding pilgrims</p>
          </div>
          <div className="absolute -left-4 top-8 h-24 w-24 animate-spin-slow rounded-full border-2 border-dashed border-gold-400/50" />
        </motion.div>

        <div>
          <SectionHeading
            align="left"
            eyebrow="About the Journey"
            title="A Spiritual Journey Crafted with Devotion"
            subtitle="For nearly two decades, Ayodhya Tirtham has guided seekers to the sacred heart of India — blending timeless tradition with modern comfort."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            className="space-y-5"
          >
            {pillars.map((p) => (
              <motion.div key={p.title} variants={fadeUp} className="flex gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-saffron-500 to-gold-500 text-2xl text-white shadow-gold">
                  <p.icon />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-royal-950">{p.title}</h3>
                  <p className="text-sm text-royal-900/70">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <ButtonLink href="/about" className="mt-8">
            Discover Our Story
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
