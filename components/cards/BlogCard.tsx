'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiClock, FiArrowRight } from 'react-icons/fi';
import type { BlogPost } from '@/types';
import { fadeUp } from '@/lib/animations';
import { formatDate } from '@/utils';

export default function BlogCard({ post, index = 0 }: { post: BlogPost; index?: number }) {
  return (
    <motion.article
      variants={fadeUp}
      custom={index % 3}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-glass ring-1 ring-royal-900/5 transition-all duration-500 hover:-translate-y-2 hover:shadow-gold-lg"
    >
      <Link href={`/blog/${post.slug}`} className="relative block h-52 overflow-hidden">
        <Image
          src={post.cover}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-royal-900 backdrop-blur">
          {post.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-3 text-xs text-royal-900/50">
          <span>{formatDate(post.date)}</span>
          <span className="flex items-center gap-1">
            <FiClock /> {post.readTime}
          </span>
        </div>
        <Link href={`/blog/${post.slug}`}>
          <h3 className="mt-3 text-lg font-bold leading-snug text-royal-950 transition-colors group-hover:text-gold-600">
            {post.title}
          </h3>
        </Link>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-royal-900/70">{post.excerpt}</p>
        <div className="mt-5 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Image
              src={post.authorAvatar}
              alt={post.author}
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-sm font-medium text-royal-900/80">{post.author}</span>
          </span>
          <Link
            href={`/blog/${post.slug}`}
            aria-label={`Read ${post.title}`}
            className="grid h-9 w-9 place-items-center rounded-full bg-gold-50 text-gold-600 transition-colors group-hover:bg-gold-500 group-hover:text-white"
          >
            <FiArrowRight />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
