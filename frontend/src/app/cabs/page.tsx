import { buildMetadata } from '@/lib/seo';
import CabsView from '@/components/views/CabsView';

export const metadata = buildMetadata({
  title: 'Ayodhya Cab Booking',
  description: 'Book reliable cabs in Ayodhya — one way, round trip, airport and railway pickups. Sedan, SUV and luxury vehicles.',
  path: '/cabs',
  keywords: ['Ayodhya Cab Booking', 'Ayodhya taxi'],
});

export default function Page() {
  return <CabsView />;
}
