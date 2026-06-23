'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FiSearch, FiGrid, FiList, FiLoader } from 'react-icons/fi';
import type { Temple, TempleCategory, TempleFilters } from '@/types';
import { getTemples } from '@/services/temple.service';
import { indianStates, templeCategories } from '@/lib/config';
import { debounce, cn } from '@/utils';
import TempleCard from '@/components/cards/TempleCard';

const PAGE_SIZE = 6;

export default function TempleDirectory() {
  const params = useSearchParams();

  const [search, setSearch] = useState(params.get('search') ?? '');
  const [state, setState] = useState(params.get('state') ?? 'All');
  const [category, setCategory] = useState<TempleCategory | 'All'>(
    (params.get('category') as TempleCategory) ?? 'All',
  );
  const [sort, setSort] = useState<NonNullable<TempleFilters['sort']>>('popularity');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const [items, setItems] = useState<Temple[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const sentinel = useRef<HTMLDivElement>(null);

  // Fetch a given page; replace on page 1, append otherwise.
  const fetchPage = useCallback(
    async (pageToLoad: number, replace: boolean) => {
      setLoading(true);
      const res = await getTemples({ search, state, category, sort, page: pageToLoad, pageSize: PAGE_SIZE });
      setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
      setHasMore(res.hasMore);
      setPage(res.page);
      setLoading(false);
    },
    [search, state, category, sort],
  );

  // Reset and refetch whenever filters change.
  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  // Infinite scroll: auto-load the next page when the sentinel is visible.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchPage(page + 1, false);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, page, fetchPage]);

  // Debounced search keeps typing smooth without firing a request per keystroke.
  const debouncedSearch = useRef(debounce((v: string) => setSearch(v), 350)).current;

  return (
    <section className="section">
      <div className="container">
        {/* Filter bar */}
        <div className="glass mb-10 grid gap-4 rounded-3xl p-5 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <span className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-royal-900/10">
            <FiSearch className="text-gold-500" />
            <input
              defaultValue={search}
              onChange={(e) => debouncedSearch(e.target.value)}
              placeholder="Search temples, deities, cities…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </span>

          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="rounded-xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10"
          >
            {indianStates.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TempleCategory | 'All')}
            className="rounded-xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10"
          >
            {templeCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as NonNullable<TempleFilters['sort']>)}
            className="rounded-xl bg-white px-4 py-3 text-sm outline-none ring-1 ring-royal-900/10"
          >
            <option value="popularity">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name (A–Z)</option>
          </select>

          <div className="flex items-center gap-2">
            {(['grid', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={`${v} view`}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-xl transition-colors',
                  view === v ? 'bg-gradient-to-br from-saffron-500 to-gold-500 text-white' : 'bg-white text-royal-900 ring-1 ring-royal-900/10',
                )}
              >
                {v === 'grid' ? <FiGrid /> : <FiList />}
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        <p className="mb-6 text-sm text-royal-900/60">
          Showing <span className="font-semibold text-royal-950">{items.length}</span> of{' '}
          <span className="font-semibold text-royal-950">{total}</span> temples
        </p>

        {/* Results */}
        {items.length === 0 && !loading ? (
          <div className="rounded-3xl bg-gold-50 py-20 text-center">
            <p className="text-lg font-semibold text-royal-950">No temples match your filters.</p>
            <p className="mt-1 text-royal-900/60">Try broadening your search.</p>
          </div>
        ) : (
          <div
            className={cn(
              view === 'grid'
                ? 'grid gap-7 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-6',
            )}
          >
            {items.map((temple, i) => (
              <TempleCard key={temple.id} temple={temple} index={i} view={view} />
            ))}
          </div>
        )}

        {/* Loading + infinite scroll sentinel */}
        <div ref={sentinel} className="mt-10 flex justify-center">
          {loading && (
            <span className="flex items-center gap-2 text-royal-900/60">
              <FiLoader className="animate-spin" /> Loading temples…
            </span>
          )}
          {!loading && hasMore && (
            <button
              onClick={() => fetchPage(page + 1, false)}
              className="rounded-full border-2 border-gold-500 px-8 py-3 font-semibold text-gold-700 transition-colors hover:bg-gold-500 hover:text-white"
            >
              Load More
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
