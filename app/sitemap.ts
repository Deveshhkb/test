import type { MetadataRoute } from 'next';
import { siteConfig } from '@/lib/config';
import { getAllTempleSlugs } from '@/services/temple.service';
import { getAllBlogSlugs } from '@/services/content.service';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes = [
    '',
    '/temples',
    '/events',
    '/gallery',
    '/videos',
    '/blog',
    '/packages',
    '/about',
    '/contact',
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.8,
  }));

  const templeRoutes = getAllTempleSlugs().map((slug) => ({
    url: `${base}/temples/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  const blogRoutes = getAllBlogSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...templeRoutes, ...blogRoutes];
}
