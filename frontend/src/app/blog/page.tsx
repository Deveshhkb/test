import { buildMetadata } from '@/lib/seo';
import BlogView from '@/components/views/BlogView';

export const metadata = buildMetadata({
  title: 'Blog & Travel Guides',
  description: 'Pilgrimage travel guides, temple stories and spiritual insights for Ayodhya, Varanasi and beyond.',
  path: '/blog',
});

export default function Page() {
  return <BlogView />;
}
