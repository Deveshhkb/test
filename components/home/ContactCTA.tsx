'use client';

import { motion } from 'framer-motion';
import { FiPhone, FiArrowRight } from 'react-icons/fi';
import { scaleIn, viewport } from '@/lib/animations';
import { ButtonLink } from '@/components/ui/Button';
import Particles from '@/components/ui/Particles';
import { siteConfig } from '@/lib/config';

export default function ContactCTA() {
  return (
    <section className="section">
      <div className="container">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="relative overflow-hidden rounded-[2.5rem] bg-saffron-royal px-6 py-16 text-center text-white md:px-16 md:py-20"
        >
          <div className="absolute inset-0 bg-royal-950/55" />
          <Particles count={18} color="bg-gold-300/40" />
          <div className="relative mx-auto max-w-2xl">
            <span className="mb-4 inline-block rounded-full border border-gold-400/40 bg-white/10 px-5 py-2 text-xs font-bold uppercase tracking-[0.3em] text-gold-300">
              Begin Your Journey
            </span>
            <h2 className="text-3xl font-bold leading-tight md:text-5xl">
              Ready to Embark on a Sacred Yatra?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/80">
              Let our pilgrimage experts craft a journey tailored to your devotion, dates and budget.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <ButtonLink href="/contact" size="lg">
                Plan My Pilgrimage <FiArrowRight />
              </ButtonLink>
              <a
                href={`tel:${siteConfig.contact.phone.replace(/\s/g, '')}`}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/50 px-8 py-4 font-semibold text-white transition-colors hover:bg-white hover:text-royal-950"
              >
                <FiPhone /> {siteConfig.contact.phone}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
