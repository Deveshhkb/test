import type { Metadata } from 'next';
import ProductListing from '@/components/listing/ProductListing';

const KNOWN: Record<string, { title: string; query: Record<string, string> }> = {
  men: { title: "Men's Fashion", query: { gender: 'men' } },
  women: { title: "Women's Fashion", query: { gender: 'women' } },
  footwear: { title: 'Footwear', query: { category: 'footwear' } },
  accessories: { title: 'Accessories', query: { category: 'accessories' } },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const known = KNOWN[category];
  const title = known?.title || `${category[0]?.toUpperCase()}${category.slice(1)}`;
  return {
    title,
    description: `Shop ${title} at NovaStyle — original designs, free shipping over ₹999.`,
    alternates: { canonical: `/${category}` },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const known = KNOWN[category];
  const title = known?.title || category;
  const query = known?.query || { category };

  return <ProductListing title={title} baseQuery={query} />;
}
