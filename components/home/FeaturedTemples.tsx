'use client';

import type { Temple } from '@/types';
import SectionHeading from '@/components/ui/SectionHeading';
import TempleCard from '@/components/cards/TempleCard';
import { ButtonLink } from '@/components/ui/Button';

export default function FeaturedTemples({ temples }: { temples: Temple[] }) {
  return (
    <section className="section">
      <div className="container">
        <SectionHeading
          eyebrow="Sacred Shrines"
          title="Featured Temples"
          subtitle="Begin your darshan with the most revered and visited temples across the country."
        />
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {temples.map((temple, i) => (
            <TempleCard key={temple.id} temple={temple} index={i} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink href="/temples" variant="outline" size="lg">
            Explore All Temples
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
