import { notFound } from 'next/navigation';
import { blogs, getBlog } from '@/data/content';
import { buildMetadata } from '@/lib/seo';
import { localize } from '@/lib/localize';
import BlogDetail from '@/components/views/BlogDetail';

export function generateStaticParams() {
  return blogs.map((b) => ({ slug: b.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getBlog(params.slug);
  if (!post) return buildMetadata({ title: 'Blog', description: 'Blog post', path: `/blog/${params.slug}` });
  return buildMetadata({
    title: localize(post.title, 'en'),
    description: localize(post.excerpt, 'en'),
    path: `/blog/${post.slug}`,
    image: post.coverImage,
    keywords: post.tags,
  });
}

export default function Page({ params }: { params: { slug: string } }) {
  const post = getBlog(params.slug);
  if (!post) notFound();
  return <BlogDetail post={post} />;
}
