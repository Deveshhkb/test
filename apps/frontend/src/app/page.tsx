import { safeApi } from '@/lib/api';
import type { Banner, Category, Product } from '@/lib/types';
import HeroSlider from '@/components/home/HeroSlider';
import FeatureMarquee from '@/components/home/FeatureMarquee';
import CategoryGrid from '@/components/home/CategoryGrid';
import ProductRail from '@/components/home/ProductRail';
import PromoSection from '@/components/home/PromoSection';
import BrandStory from '@/components/home/BrandStory';
import Testimonials from '@/components/home/Testimonials';

export const revalidate = 120;

async function getCollection(name: string): Promise<Product[]> {
  const data = await safeApi<{ products: Product[] }>(
    `/products?collection=${name}&limit=10`,
    { products: [] }
  );
  return data.products;
}

export default async function HomePage() {
  const [bannerData, categoryData, trending, newArrivals, bestSellers] = await Promise.all([
    safeApi<{ banners: Banner[] }>('/banners?placement=hero', { banners: [] }),
    safeApi<{ categories: Category[] }>('/catalog/categories', { categories: [] }),
    getCollection('trending'),
    getCollection('new-arrivals'),
    getCollection('best-sellers'),
  ]);

  return (
    <>
      <HeroSlider banners={bannerData.banners} />
      <FeatureMarquee />
      <CategoryGrid categories={categoryData.categories} />
      <ProductRail
        title="Trending Now"
        subtitle="What everyone's wearing this week"
        products={trending}
        viewAllHref="/collections/trending"
      />
      <PromoSection />
      <ProductRail
        title="New Arrivals"
        subtitle="Fresh drops, just landed"
        products={newArrivals}
        viewAllHref="/collections/new-arrivals"
      />
      <ProductRail
        title="Best Sellers"
        subtitle="Tried, tested & loved"
        products={bestSellers}
        viewAllHref="/collections/best-sellers"
      />
      <BrandStory />
      <Testimonials />
    </>
  );
}
