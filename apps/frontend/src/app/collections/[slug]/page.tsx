import type { Metadata } from 'next';
import ProductListing from '@/components/listing/ProductListing';

const LABELS: Record<string, string> = {
  'new-arrivals': 'New Arrivals',
  'best-sellers': 'Best Sellers',
  trending: 'Trending Now',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = LABELS[slug] || slug;
  return {
    title,
    description: `Explore the ${title} collection at NovaStyle.`,
    alternates: { canonical: `/collections/${slug}` },
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = LABELS[slug] || slug;
  return <ProductListing title={title} baseQuery={{ collection: slug }} />;
}
