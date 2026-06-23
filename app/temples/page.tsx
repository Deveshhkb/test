import { Suspense } from 'react';
import type { Metadata } from 'next';
import PageHero from '@/components/ui/PageHero';
import TempleDirectory from '@/components/temples/TempleDirectory';

export const metadata: Metadata = {
  title: 'Temple Directory',
  description:
    'Browse and search 1200+ sacred temples across India. Filter by state, category and popularity to plan your pilgrimage.',
  alternates: { canonical: '/temples' },
};

export default function TemplesPage() {
  return (
    <>
      <PageHero
        title="Temple Directory"
        subtitle="Discover sacred shrines across India — search, filter and find your next darshan."
        crumbs={[{ label: 'Temples' }]}
        image="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1920&q=80"
      />
      <Suspense fallback={<div className="section container">Loading directory…</div>}>
        <TempleDirectory />
      </Suspense>
    </>
  );
}
