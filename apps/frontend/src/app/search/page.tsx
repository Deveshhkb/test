import ProductListing from '@/components/listing/ProductListing';

export const metadata = {
  title: 'Search',
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  return (
    <ProductListing
      title={q ? `Search: "${q}"` : 'Search'}
      baseQuery={q ? { search: q } : {}}
    />
  );
}
