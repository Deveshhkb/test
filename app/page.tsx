import { getFeaturedTemples } from '@/services/temple.service';
import {
  getUpcomingEvents,
  getPopularPackages,
  getBlogPosts,
  getVideos,
  getGallery,
} from '@/services/content.service';
import { testimonials, stats, destinations, homeFaqs } from '@/lib/data/misc';

import Hero from '@/components/home/Hero';
import QuickSearch from '@/components/home/QuickSearch';
import FeaturedTemples from '@/components/home/FeaturedTemples';
import AboutSection from '@/components/home/AboutSection';
import Destinations from '@/components/home/Destinations';
import UpcomingEvents from '@/components/home/UpcomingEvents';
import PackagesSection from '@/components/home/PackagesSection';
import StatsCounter from '@/components/home/StatsCounter';
import VideoShowcase from '@/components/home/VideoShowcase';
import GalleryPreview from '@/components/home/GalleryPreview';
import Testimonials from '@/components/home/Testimonials';
import LatestNews from '@/components/home/LatestNews';
import FAQSection from '@/components/home/FAQSection';
import ContactCTA from '@/components/home/ContactCTA';

export default async function HomePage() {
  // Data is fetched on the server (component-level) so the page renders fully
  // formed for SEO and fast first paint.
  const [featured, events, packages, posts, videos, gallery] = await Promise.all([
    getFeaturedTemples(6),
    getUpcomingEvents(3),
    getPopularPackages(3),
    getBlogPosts(),
    getVideos(),
    getGallery(),
  ]);

  return (
    <>
      <Hero />
      <QuickSearch />
      <FeaturedTemples temples={featured} />
      <AboutSection />
      <Destinations destinations={destinations} />
      <UpcomingEvents events={events} />
      <PackagesSection packages={packages} />
      <StatsCounter stats={stats} />
      <VideoShowcase videos={videos} />
      <GalleryPreview images={gallery} />
      <Testimonials testimonials={testimonials} />
      <LatestNews posts={posts} />
      <FAQSection faqs={homeFaqs} />
      <ContactCTA />
    </>
  );
}
