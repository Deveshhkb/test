import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getBlogPosts } from '@/services/content.service';
import PageHero from '@/components/ui/PageHero';
import BlogList from '@/components/blog/BlogList';

export const metadata: Metadata = {
  title: 'Blog & News',
  description: 'Travel guides, spiritual insights and festival stories from the Ayodhya Tirtham editors.',
  alternates: { canonical: '/blog' },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <>
      <PageHero
        title="Blog & News"
        subtitle="Guides, stories and insights for the modern pilgrim."
        crumbs={[{ label: 'Blog' }]}
        image="https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1920&q=80"
      />
      <Suspense fallback={<div className="section container">Loading articles…</div>}>
        <BlogList posts={posts} />
      </Suspense>
    </>
  );
}
