'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const PROMOS = [
  {
    title: 'Buy 2 Get 1 Free',
    subtitle: 'On all t-shirts & basics',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=70',
    link: '/men',
    cta: 'Grab the deal',
  },
  {
    title: 'Footwear Fest',
    subtitle: 'Sneakers starting ₹1999',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=70',
    link: '/footwear',
    cta: 'Step in',
  },
];

export default function PromoSection() {
  return (
    <section className="container-nova py-10">
      <div className="grid gap-4 md:grid-cols-2">
        {PROMOS.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link href={p.link} className="group relative block aspect-[16/9] overflow-hidden rounded-3xl">
              <Image src={p.image} alt={p.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-tr from-ink/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center p-8 text-white">
                <h3 className="text-2xl font-black sm:text-3xl">{p.title}</h3>
                <p className="mt-1 text-white/80">{p.subtitle}</p>
                <span className="mt-4 inline-flex w-fit items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink">
                  {p.cta} →
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
