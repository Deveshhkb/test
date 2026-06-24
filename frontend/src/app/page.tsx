import Hero from '@/components/home/Hero';
import FeaturedDestinations from '@/components/home/FeaturedDestinations';
import PopularPackages from '@/components/home/PopularPackages';
import TempleCategories from '@/components/home/TempleCategories';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import StatsCounter from '@/components/home/StatsCounter';
import Testimonials from '@/components/home/Testimonials';
import GalleryPreview from '@/components/home/GalleryPreview';
import BlogPreview from '@/components/home/BlogPreview';
import ContactCTA from '@/components/home/ContactCTA';

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeaturedDestinations />
      <PopularPackages />
      <TempleCategories />
      <WhyChooseUs />
      <StatsCounter />
      <Testimonials />
      <GalleryPreview />
      <BlogPreview />
      <ContactCTA />
    </>
  );
}
