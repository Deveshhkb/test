'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaRegClock, FaCalendarAlt, FaUser, FaTag } from 'react-icons/fa';
import type { BlogPost } from '@/lib/types';
import { localize, formatDate } from '@/lib/localize';
import { blogs } from '@/data/content';
import PageHeader from '@/components/shared/PageHeader';
import BlogCard from '@/components/shared/BlogCard';
import Reveal from '@/components/shared/Reveal';

export default function BlogDetail({ post }: { post: BlogPost }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const related = blogs.filter((b) => b.slug !== post.slug).slice(0, 3);

  return (
    <>
      <PageHeader title={localize(post.title, lang)} image={post.coverImage} />
      <article className="section">
        <div className="container-px max-w-3xl">
          <Reveal>
            <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1"><FaUser className="h-3 w-3" /> Ayodhya Tirtham</span>
              <span className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDate(post.date)}</span>
              <span className="flex items-center gap-1"><FaRegClock className="h-3 w-3" /> {post.readTime} {t('blog.minRead')}</span>
              <span className="chip">{post.category}</span>
            </div>
            <p className="text-lg font-medium text-gray-700">{localize(post.excerpt, lang)}</p>
            <div className="prose mt-6 max-w-none leading-relaxed text-gray-600">
              {localize(post.content, lang).split('\n').map((p, i) => <p key={i} className="mb-4">{p}</p>)}
            </div>
            <div className="mt-8 flex flex-wrap gap-2 border-t border-gray-100 pt-6">
              {post.tags.map((tag) => (
                <span key={tag} className="chip"><FaTag className="mr-1 h-3 w-3" /> {tag}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </article>

      <section className="section bg-primary-50/40">
        <div className="container-px">
          <h2 className="section-title mb-8 text-center text-2xl">{t('blog.relatedPosts')}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((b) => <BlogCard key={b.slug} post={b} />)}
          </div>
          <div className="mt-10 text-center">
            <Link href="/blog" className="btn-ghost">{t('common.viewAll')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
