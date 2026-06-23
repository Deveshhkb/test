'use client';

import type { EventItem } from '@/types';
import SectionHeading from '@/components/ui/SectionHeading';
import EventCard from '@/components/cards/EventCard';
import { ButtonLink } from '@/components/ui/Button';

export default function UpcomingEvents({ events }: { events: EventItem[] }) {
  return (
    <section className="section bg-gradient-to-b from-gold-50 to-white">
      <div className="container">
        <SectionHeading
          eyebrow="Sacred Calendar"
          title="Upcoming Festivals & Events"
          subtitle="Plan your visit around the most auspicious celebrations of the year."
        />
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink href="/events" variant="outline" size="lg">
            View Full Calendar
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
