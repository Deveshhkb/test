'use client';

import type { TourPackage } from '@/types';
import SectionHeading from '@/components/ui/SectionHeading';
import PackageCard from '@/components/cards/PackageCard';
import { ButtonLink } from '@/components/ui/Button';

export default function PackagesSection({ packages }: { packages: TourPackage[] }) {
  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Curated Yatras"
          title="Pilgrimage Packages"
          subtitle="Thoughtfully designed journeys with premium stays, VIP darshan and expert guidance."
        />
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.id} pkg={pkg} index={i} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink href="/packages" variant="outline" size="lg">
            View All Packages
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
