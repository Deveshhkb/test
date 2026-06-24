import { buildMetadata } from '@/lib/seo';
import PackagesView from '@/components/views/PackagesView';

export const metadata = buildMetadata({
  title: 'Ayodhya Tour Packages',
  description: 'Book Ayodhya darshan and combined pilgrimage tour packages — Ayodhya, Varanasi, Prayagraj and Naimisharanya.',
  path: '/packages',
  keywords: ['Ayodhya Tour Packages', 'Ayodhya Darshan', 'Ram Mandir Tour'],
});

export default function Page() {
  return <PackagesView />;
}
