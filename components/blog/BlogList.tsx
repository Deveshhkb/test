'use client';

import { useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import type { BlogPost } from '@/types';
import { blogCategories } from '@/lib/data/blog';
import BlogCard from '@/components/cards/BlogCard';
import { cn } from '@/utils';

export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const matchCat = category === 'All' || p.category === category;
      const matchQuery =
        !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [posts, category, query]);

  return (
    <section className="section">
      <div className="container">
        <div className="mb-10 flex flex-col items-center justify-between gap-5 lg:flex-row">
          <div className="flex flex-wrap justify-center gap-2.5">
            {blogCategories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                  category === c
                    ? 'bg-gradient-to-r from-saffron-500 to-gold-500 text-white shadow-gold'
                    : 'bg-white text-royal-900 ring-1 ring-royal-900/10 hover:bg-gold-50',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <span className="flex w-full items-center gap-2 rounded-full bg-white px-4 py-2.5 ring-1 ring-royal-900/10 lg:w-72">
            <FiSearch className="text-gold-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-gold-50 py-20 text-center">
            <p className="text-lg font-semibold text-royal-950">No articles found.</p>
          </div>
        ) : (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((post, i) => (
              <BlogCard key={post.id} post={post} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
