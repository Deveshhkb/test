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
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sub?: string }>;
}) {
  const { category } = await params;
  const { sub } = await searchParams;
  const known = KNOWN[category];
  let title = known?.title || category;
  const query: Record<string, string> = { ...(known?.query || { category }) };

  // A sub-category from the mega menu narrows results via text search
  // (e.g. /men?sub=hoodies). "All ..." entries just show the full category.
  if (sub && !sub.startsWith('all ')) {
    query.search = sub;
    title = `${known?.title || category} · ${sub.replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }

  return <ProductListing key={sub || category} title={title} baseQuery={query} />;
}
