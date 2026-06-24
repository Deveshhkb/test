'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { blogs } from '@/data/content';
import SectionHeading from '@/components/shared/SectionHeading';
import BlogCard from '@/components/shared/BlogCard';
import Reveal from '@/components/shared/Reveal';

export default function BlogPreview() {
  const { t } = useTranslation();
  return (
    <section className="section">
      <div className="container-px">
        <SectionHeading eyebrow="📝" title={t('sections.blogTitle')} subtitle={t('sections.blogSubtitle')} />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {blogs.slice(0, 3).map((b, i) => (
            <Reveal key={b.slug} delay={i * 0.08}>
              <BlogCard post={b} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/blog" className="btn-ghost">{t('common.viewAll')}</Link>
        </div>
      </div>
    </section>
  );
}
