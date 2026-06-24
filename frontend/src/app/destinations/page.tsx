import { buildMetadata } from '@/lib/seo';
import DestinationsView from '@/components/views/DestinationsView';

export const metadata = buildMetadata({
  title: 'Pilgrimage Destinations',
  description: 'Explore sacred pilgrimage destinations — Ayodhya, Varanasi, Prayagraj, Mathura, Vrindavan and more.',
  path: '/destinations',
  keywords: ['Ayodhya', 'Varanasi tour', 'Prayagraj', 'Mathura Vrindavan'],
});

export default function Page() {
  return <DestinationsView />;
}
