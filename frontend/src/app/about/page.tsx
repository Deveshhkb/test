import { buildMetadata } from '@/lib/seo';
import AboutView from '@/components/views/AboutView';

export const metadata = buildMetadata({
  title: 'About Us',
  description: 'Ayodhya Tirtham is a premium pilgrimage travel company making sacred journeys across Bharat seamless and spiritual.',
  path: '/about',
});

export default function Page() {
  return <AboutView />;
}
