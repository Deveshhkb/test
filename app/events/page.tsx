import type { Metadata } from 'next';
import { getEvents } from '@/services/content.service';
import PageHero from '@/components/ui/PageHero';
import EventsList from '@/components/events/EventsList';

export const metadata: Metadata = {
  title: 'Events & Festivals',
  description:
    'Discover upcoming festivals, ceremonies and sacred yatras across India. Register for events with live countdowns.',
  alternates: { canonical: '/events' },
};

export default async function EventsPage() {
  const events = await getEvents();
  return (
    <>
      <PageHero
        title="Events & Festivals"
        subtitle="Celebrate the sacred calendar of India — festivals, ceremonies and yatras."
        crumbs={[{ label: 'Events' }]}
        image="https://images.unsplash.com/photo-1574236170880-f22433e8d3c5?auto=format&fit=crop&w=1920&q=80"
      />
      <EventsList events={events} />
    </>
  );
}
