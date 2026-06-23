import type { Metadata } from 'next';
import { getPackages } from '@/services/content.service';
import PageHero from '@/components/ui/PageHero';
import PackagesView from '@/components/packages/PackagesView';

export const metadata: Metadata = {
  title: 'Pilgrimage Packages',
  description:
    'Curated spiritual tourism packages with premium stays, VIP darshan, expert guides and detailed itineraries.',
  alternates: { canonical: '/packages' },
};

export default async function PackagesPage() {
  const packages = await getPackages();
  return (
    <>
      <PageHero
        title="Pilgrimage Packages"
        subtitle="Curated yatras crafted with devotion, comfort and care."
        crumbs={[{ label: 'Packages' }]}
        image="https://images.unsplash.com/photo-1606298855672-3efb63017be8?auto=format&fit=crop&w=1920&q=80"
      />
      <PackagesView packages={packages} />
    </>
  );
}
