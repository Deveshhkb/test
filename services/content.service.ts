import { events } from '@/lib/data/events';
import { blogPosts } from '@/lib/data/blog';
import { packages } from '@/lib/data/packages';
import { videos } from '@/lib/data/videos';
import { galleryImages } from '@/lib/data/gallery';
import type { BlogPost, EventItem, TourPackage } from '@/types';

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

// ---- Events ----------------------------------------------------------------
export async function getEvents(): Promise<EventItem[]> {
  await delay();
  return [...events].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export async function getUpcomingEvents(limit = 3): Promise<EventItem[]> {
  const all = await getEvents();
  return all.filter((e) => +new Date(e.date) >= Date.now()).slice(0, limit);
}

export async function getEventBySlug(slug: string): Promise<EventItem | null> {
  await delay();
  return events.find((e) => e.slug === slug) ?? null;
}

// ---- Blog ------------------------------------------------------------------
export async function getBlogPosts(): Promise<BlogPost[]> {
  await delay();
  return [...blogPosts].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  await delay();
  return blogPosts.find((p) => p.slug === slug) ?? null;
}

export async function getRelatedPosts(slug: string, limit = 3): Promise<BlogPost[]> {
  const current = blogPosts.find((p) => p.slug === slug);
  return blogPosts
    .filter((p) => p.slug !== slug && (!current || p.category === current.category))
    .slice(0, limit);
}

export function getAllBlogSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}

// ---- Packages --------------------------------------------------------------
export async function getPackages(): Promise<TourPackage[]> {
  await delay();
  return packages;
}

export async function getPopularPackages(limit = 3): Promise<TourPackage[]> {
  await delay();
  return packages.filter((p) => p.popular).slice(0, limit);
}

export async function getPackageBySlug(slug: string): Promise<TourPackage | null> {
  await delay();
  return packages.find((p) => p.slug === slug) ?? null;
}

// ---- Media -----------------------------------------------------------------
export async function getVideos() {
  await delay();
  return videos;
}

export async function getGallery() {
  await delay();
  return galleryImages;
}
