'use client';

import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const REVIEWS = [
  { name: 'Aarav S.', text: 'The fabric quality genuinely surprised me — soft, durable and the fit is spot on. My new go-to brand.', rating: 5 },
  { name: 'Priya M.', text: 'Fast delivery and the dress looked exactly like the photos. Got so many compliments!', rating: 5 },
  { name: 'Karan D.', text: 'Great prices for the quality. The hoodie is super cozy and the sizing guide was accurate.', rating: 4 },
  { name: 'Neha R.', text: 'Smooth checkout, easy returns, and the sneakers are incredibly comfortable. Highly recommend.', rating: 5 },
];

export default function Testimonials() {
  return (
    <section className="bg-nova-50 py-14">
      <div className="container-nova">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black sm:text-3xl">Loved by 50,000+ customers</h2>
          <p className="mt-1 text-sm text-ink/50">Real reviews from the NovaStyle community</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEWS.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl bg-white p-6 shadow-sm"
            >
              <Quote className="h-7 w-7 text-nova-200" />
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s < r.rating ? 'fill-amber-400 text-amber-400' : 'text-ink/15'}`}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm text-ink/70">{r.text}</p>
              <p className="mt-4 text-sm font-semibold">{r.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
