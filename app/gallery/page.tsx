import type { Metadata } from 'next';
import { getGallery } from '@/services/content.service';
import PageHero from '@/components/ui/PageHero';
import GalleryGrid from '@/components/gallery/GalleryGrid';

export const metadata: Metadata = {
  title: 'Photo Gallery',
  description: 'A curated gallery of temples, festivals, rituals and pilgrims across sacred India.',
  alternates: { canonical: '/gallery' },
};

export default async function GalleryPage() {
  const images = await getGallery();
  return (
    <>
      <PageHero
        title="Photo Gallery"
        subtitle="Witness the colour, light and devotion of sacred India."
        crumbs={[{ label: 'Gallery' }]}
        image="https://images.unsplash.com/photo-1567253186010-1c2c8b0c0c0f?auto=format&fit=crop&w=1920&q=80"
      />
      <GalleryGrid images={images} />
    </>
  );
}
