import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FiClock, FiCalendar, FiTag } from 'react-icons/fi';
import {
  getBlogPostBySlug,
  getRelatedPosts,
  getAllBlogSlugs,
} from '@/services/content.service';
import { siteConfig } from '@/lib/config';
import { formatDate } from '@/utils';
import PageHero from '@/components/ui/PageHero';
import PostContent from '@/components/blog/PostContent';
import BlogCard from '@/components/cards/BlogCard';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Article Not Found' };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.cover }],
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(slug);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.cover,
    datePublished: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: siteConfig.name },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHero
        title={post.title}
        image={post.cover}
        crumbs={[{ label: 'Blog', href: '/blog' }, { label: post.category }]}
      />

      <article className="section">
        <div className="container max-w-3xl">
          <div className="flex flex-wrap items-center gap-4 border-b border-gold-100 pb-6 text-sm text-royal-900/60">
            <span className="flex items-center gap-2">
              <Image src={post.authorAvatar} alt={post.author} width={36} height={36} className="rounded-full" />
              <span className="font-semibold text-royal-950">{post.author}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <FiCalendar className="text-gold-500" /> {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <FiClock className="text-gold-500" /> {post.readTime}
            </span>
            <span className="flex items-center gap-1.5">
              <FiTag className="text-gold-500" /> {post.category}
            </span>
          </div>

          <div className="mt-8">
            <PostContent content={post.content} />
          </div>

          <div className="mt-10 flex flex-wrap gap-2 border-t border-gold-100 pt-6">
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className="rounded-full bg-gold-50 px-4 py-1.5 text-sm font-medium text-royal-900/70 hover:bg-gold-100"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="section bg-gradient-to-b from-white to-gold-50">
          <div className="container">
            <h2 className="mb-10 text-center font-display text-3xl font-bold text-royal-950">
              Related Articles
            </h2>
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <BlogCard key={p.id} post={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
