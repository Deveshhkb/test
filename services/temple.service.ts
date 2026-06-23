import { temples } from '@/lib/data/temples';
import type { PaginatedResult, Temple, TempleFilters } from '@/types';

// ---------------------------------------------------------------------------
// Service layer. Today these read from local seed data, but every function is
// async and returns API-shaped responses so they can be swapped for real
// `fetch` calls to a backend without touching the UI components.
// ---------------------------------------------------------------------------

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

export async function getTemples(
  filters: TempleFilters = {},
): Promise<PaginatedResult<Temple>> {
  const {
    search = '',
    state = 'All',
    category = 'All',
    sort = 'popularity',
    page = 1,
    pageSize = 6,
  } = filters;

  await delay();

  let result = [...temples];

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.deity.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q),
    );
  }

  if (state && state !== 'All') {
    result = result.filter((t) => t.state === state);
  }

  if (category && category !== 'All') {
    result = result.filter((t) => t.category === category);
  }

  result.sort((a, b) => {
    if (sort === 'rating') return b.rating - a.rating;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return b.popularity - a.popularity;
  });

  const total = result.length;
  const start = (page - 1) * pageSize;
  const items = result.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  };
}

export async function getTempleBySlug(slug: string): Promise<Temple | null> {
  await delay(150);
  return temples.find((t) => t.slug === slug) ?? null;
}

export async function getFeaturedTemples(limit = 6): Promise<Temple[]> {
  await delay(150);
  return temples.filter((t) => t.featured).slice(0, limit);
}

export function getAllTempleSlugs(): string[] {
  return temples.map((t) => t.slug);
}
