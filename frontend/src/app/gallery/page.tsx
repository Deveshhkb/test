import { buildMetadata } from '@/lib/seo';
import GalleryView from '@/components/views/GalleryView';

export const metadata = buildMetadata({
  title: 'Gallery',
  description: 'A visual pilgrimage — photos of temples, ghats, aarti and festivals across sacred India.',
  path: '/gallery',
});

export default function Page() {
  return <GalleryView />;
}
