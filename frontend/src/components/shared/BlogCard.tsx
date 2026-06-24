'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { FaRegClock, FaCalendarAlt } from 'react-icons/fa';
import type { BlogPost } from '@/lib/types';
import { localize } from '@/lib/localize';

export default function BlogCard({ post }: { post: BlogPost }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <article className="card group flex flex-col">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden">
        <Image src={post.coverImage} alt={localize(post.title, lang)} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
        <span className="absolute left-3 top-3 chip bg-white/90">{post.category}</span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {new Date(post.date).toLocaleDateString()}</span>
          <span className="flex items-center gap-1"><FaRegClock className="h-3 w-3" /> {post.readTime} {t('blog.minRead')}</span>
        </div>
        <h3 className="font-heading text-lg font-semibold text-ink">
          <Link href={`/blog/${post.slug}`} className="hover:text-primary">{localize(post.title, lang)}</Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">{localize(post.excerpt, lang)}</p>
        <Link href={`/blog/${post.slug}`} className="mt-auto pt-4 text-sm font-semibold text-primary hover:underline">
          {t('common.readMore')} →
        </Link>
      </div>
    </article>
  );
}
