import { buildMetadata } from '@/lib/seo';
import TemplesView from '@/components/views/TemplesView';

export const metadata = buildMetadata({
  title: 'Temple Directory',
  description: 'Discover sacred temples with darshan timings, aarti timings, dress code and nearby attractions.',
  path: '/temples',
  keywords: ['Ram Mandir', 'Kashi Vishwanath', 'temple timings'],
});

export default function Page({ searchParams }: { searchParams: { category?: string } }) {
  return <TemplesView initialCategory={searchParams.category || 'All'} />;
}
