'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import type { Product, Brand } from '@/lib/types';
import ProductCard from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';
import { useT } from '@/context/LocaleContext';

interface Props {
  title: string;
  baseQuery: Record<string, string>; // e.g. { category: 'men' } or { collection: 'trending' } or { search: 'x' }
}

const SORTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popularity' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'White', 'Navy', 'Olive', 'Maroon'];
const PRICE_BUCKETS = [
  { label: 'Under ₹999', min: 0, max: 999 },
  { label: '₹999 – ₹1999', min: 999, max: 1999 },
  { label: '₹1999 – ₹2999', min: 1999, max: 2999 },
  { label: '₹2999+', min: 2999, max: 100000 },
];

export default function ProductListing({ title, baseQuery }: Props) {
  const t = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [sort, setSort] = useState('newest');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [brand, setBrand] = useState('');
  const [priceIdx, setPriceIdx] = useState<number | null>(null);

  const sentinel = useRef<HTMLDivElement>(null);
  const baseKey = JSON.stringify(baseQuery);

  useEffect(() => {
    api<{ brands: Brand[] }>('/catalog/brands')
      .then((d) => setBrands(d.brands))
      .catch(() => {});
  }, []);

  const buildQuery = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams({ ...baseQuery, sort, page: String(pageNum), limit: '12' });
      if (size) params.set('size', size);
      if (color) params.set('color', color);
      if (brand) params.set('brand', brand);
      if (priceIdx !== null) {
        params.set('minPrice', String(PRICE_BUCKETS[priceIdx].min));
        params.set('maxPrice', String(PRICE_BUCKETS[priceIdx].max));
      }
      return params.toString();
    },
    [baseKey, sort, size, color, brand, priceIdx] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Reset + fetch first page whenever filters change.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPage(1);
    api<{ products: Product[]; pagination: { hasMore: boolean; total: number } }>(
      `/products?${buildQuery(1)}`
    )
      .then((d) => {
        if (!active) return;
        setProducts(d.products);
        setHasMore(d.pagination.hasMore);
        setTotal(d.pagination.total);
      })
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    const next = page + 1;
    try {
      const d = await api<{ products: Product[]; pagination: { hasMore: boolean } }>(
        `/products?${buildQuery(next)}`
      );
      setProducts((prev) => [...prev, ...d.products]);
      setHasMore(d.pagination.hasMore);
      setPage(next);
    } catch {
      /* ignore */
    }
  }, [page, buildQuery]);

  // Infinite scroll via IntersectionObserver.
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, loadMore]);

  const clearFilters = () => {
    setSize('');
    setColor('');
    setBrand('');
    setPriceIdx(null);
  };

  const activeCount = [size, color, brand].filter(Boolean).length + (priceIdx !== null ? 1 : 0);

  const FilterPanel = (
    <div className="space-y-7">
      <FilterGroup title="Price">
        <div className="space-y-2">
          {PRICE_BUCKETS.map((b, i) => (
            <label key={b.label} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="price"
                checked={priceIdx === i}
                onChange={() => setPriceIdx(priceIdx === i ? null : i)}
                className="accent-nova-600"
              />
              {b.label}
            </label>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(size === s ? '' : s)}
              className={cn(
                'h-9 w-9 rounded-lg border text-sm font-medium transition',
                size === s ? 'border-ink bg-ink text-white' : 'border-ink/15 hover:border-ink'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Color">
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(color === c ? '' : c)}
              className={cn(
                'chip transition',
                color === c ? 'border-ink bg-ink text-white' : 'hover:border-ink'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </FilterGroup>

      {brands.length > 0 && (
        <FilterGroup title="Brand">
          <div className="space-y-2">
            {brands.map((b) => (
              <label key={b._id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="brand"
                  checked={brand === b._id}
                  onChange={() => setBrand(brand === b._id ? '' : b._id)}
                  className="accent-nova-600"
                />
                {b.name}
              </label>
            ))}
          </div>
        </FilterGroup>
      )}
    </div>
  );

  return (
    <div className="container-nova py-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-3xl font-black capitalize">{title}</h1>
        <p className="text-sm text-ink/50">{total} products</p>
      </div>

      <div className="flex items-center justify-between gap-3 border-y border-ink/10 py-3">
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-2 text-sm font-semibold lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeCount > 0 && ` (${activeCount})`}
        </button>
        {activeCount > 0 && (
          <button onClick={clearFilters} className="hidden text-sm text-accent lg:block">
            Clear all filters
          </button>
        )}
        <div className="relative ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="appearance-none rounded-full border border-ink/15 bg-white py-2 pl-4 pr-9 text-sm font-medium outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">{FilterPanel}</aside>

        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-ink/5" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="text-lg font-semibold">{t('empty.products')}</p>
              <p className="text-sm text-ink/50">{t('empty.adjustFilters')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
              </div>
              <div ref={sentinel} className="h-10" />
              {hasMore && (
                <div className="mt-6 text-center">
                  <button onClick={loadMore} className="btn-outline">
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setShowFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Filters</h3>
              <button onClick={() => setShowFilters(false)} aria-label="Close filters">
                <X className="h-6 w-6" />
              </button>
            </div>
            {FilterPanel}
            <div className="mt-6 flex gap-3">
              <button onClick={clearFilters} className="btn-outline flex-1">
                Clear
              </button>
              <button onClick={() => setShowFilters(false)} className="btn-primary flex-1">
                Show {total} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold">{title}</p>
      {children}
    </div>
  );
}
