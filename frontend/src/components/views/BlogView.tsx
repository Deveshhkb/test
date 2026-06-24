'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { blogs } from '@/data/content';
import PageHeader from '@/components/shared/PageHeader';
import BlogCard from '@/components/shared/BlogCard';
import Reveal from '@/components/shared/Reveal';

export default function BlogView() {
  const { t } = useTranslation();
  const categories = ['All', ...Array.from(new Set(blogs.map((b) => b.category)))];
  const [category, setCategory] = useState('All');

  const filtered = useMemo(
    () => (category === 'All' ? blogs : blogs.filter((b) => b.category === category)),
    [category]
  );

  return (
    <>
      <PageHeader title={t('blog.title')} subtitle={t('blog.subtitle')} />
      <section className="section">
        <div className="container-px">
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${category === c ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-primary'}`}>
                {c === 'All' ? t('common.all') : c}
              </button>
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b, i) => (
              <Reveal key={b.slug} delay={i * 0.05}>
                <BlogCard post={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
