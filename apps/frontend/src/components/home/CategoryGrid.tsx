'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { Category } from '@/lib/types';

const FALLBACK: Category[] = [
  { _id: 'c1', name: 'Men', slug: 'men', image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=600&q=70' },
  { _id: 'c2', name: 'Women', slug: 'women', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=70' },
  { _id: 'c3', name: 'Accessories', slug: 'accessories', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=70' },
  { _id: 'c4', name: 'Footwear', slug: 'footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=70' },
];

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  const list = categories.length ? categories : FALLBACK;

  return (
    <section className="container-nova py-10">
      <h2 className="mb-6 text-2xl font-black sm:text-3xl">Shop by Category</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {list.map((cat, i) => (
          <motion.div
            key={cat._id}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Link
              href={`/${cat.slug}`}
              className="group relative block aspect-square overflow-hidden rounded-2xl bg-ink/5"
            >
              {cat.image && (
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-lg font-bold text-white">{cat.name}</p>
                <p className="text-xs text-white/80">Shop now →</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
