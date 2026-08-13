import type { MetadataRoute } from 'next';
import { safeApi } from '@/lib/api';
import type { Product } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ['', '/men', '/women', '/footwear', '/accessories', '/collections/new-arrivals', '/collections/best-sellers', '/collections/trending'].map(
    (path) => ({
      url: `${siteUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: path === '' ? 1 : 0.8,
    })
  );

  const { products } = await safeApi<{ products: Product[] }>('/products?limit=60', { products: [] }, 3600);
  const productRoutes = products.map((p) => ({
    url: `${siteUrl}/product/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes];
}
