'use client';

import type { BlogPost } from '@/types';
import SectionHeading from '@/components/ui/SectionHeading';
import BlogCard from '@/components/cards/BlogCard';
import { ButtonLink } from '@/components/ui/Button';

export default function LatestNews({ posts }: { posts: BlogPost[] }) {
  return (
    <section className="section bg-gradient-to-b from-white to-gold-50">
      <div className="container">
        <SectionHeading
          eyebrow="Stories & Guides"
          title="Latest News & Articles"
          subtitle="Travel guides, spiritual insights and festival stories from our editors."
        />
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {posts.slice(0, 3).map((post, i) => (
            <BlogCard key={post.id} post={post} index={i} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink href="/blog" variant="outline" size="lg">
            Read the Blog
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
