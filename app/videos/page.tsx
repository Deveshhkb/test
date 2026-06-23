import type { Metadata } from 'next';
import { getVideos } from '@/services/content.service';
import PageHero from '@/components/ui/PageHero';
import VideoGrid from '@/components/videos/VideoGrid';

export const metadata: Metadata = {
  title: 'Video Gallery',
  description: 'Watch aerial tours, rituals and festival films from India’s most sacred temples.',
  alternates: { canonical: '/videos' },
};

export default async function VideosPage() {
  const videos = await getVideos();
  return (
    <>
      <PageHero
        title="Video Gallery"
        subtitle="Immerse yourself in the sights and sounds of sacred India."
        crumbs={[{ label: 'Videos' }]}
        image="https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1920&q=80"
      />
      <VideoGrid videos={videos} />
    </>
  );
}
