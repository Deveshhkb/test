import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { safeApi } from '@/lib/api';

interface CmsPage {
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
}

async function getPage(slug: string) {
  return safeApi<{ page: CmsPage | null }>(`/cms/${slug}`, { page: null }, 300);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await getPage(slug);
  if (!page) return { title: 'Page not found' };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: { canonical: `/page/${slug}` },
  };
}

export default async function CmsPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { page } = await getPage(slug);
  if (!page) notFound();

  return (
    <article className="container-nova max-w-3xl py-12">
      <h1 className="text-3xl font-black">{page.title}</h1>
      <div
        className="prose prose-sm mt-6 max-w-none text-ink/70 [&_a]:text-nova-600 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </article>
  );
}
