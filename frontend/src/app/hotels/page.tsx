import { buildMetadata } from '@/lib/seo';
import HotelsView from '@/components/views/HotelsView';

export const metadata = buildMetadata({
  title: 'Ayodhya Hotels',
  description: 'Book comfortable hotels near Ram Mandir and other holy sites. Filter by price, rating and amenities.',
  path: '/hotels',
  keywords: ['Ayodhya Hotels', 'hotels near Ram Mandir'],
});

export default function Page() {
  return <HotelsView />;
}
