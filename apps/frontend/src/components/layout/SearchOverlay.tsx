'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, X, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';

const TRENDING = ['Hoodie', 'Oversized Tee', 'Sneakers', 'Jeans', 'Watch'];

export default function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      try {
        setHistory(JSON.parse(localStorage.getItem('nova_search') || '[]'));
      } catch {
        /* ignore */
      }
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Debounced instant search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api<{ products: Product[] }>(
          `/products?search=${encodeURIComponent(query)}&limit=6`
        );
        setResults(data.products);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const submit = (term: string) => {
    if (!term.trim()) return;
    const next = [term, ...history.filter((h) => h !== term)].slice(0, 6);
    setHistory(next);
    localStorage.setItem('nova_search', JSON.stringify(next));
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 top-0 bg-white shadow-xl">
        <div className="container-nova py-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
            className="flex items-center gap-3"
          >
            <Search className="h-5 w-5 text-ink/40" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, brands and more..."
              className="flex-1 bg-transparent text-lg outline-none"
            />
            <button type="button" onClick={onClose} aria-label="Close search">
              <X className="h-6 w-6" />
            </button>
          </form>

          <div className="mt-5 max-h-[60vh] overflow-y-auto">
            {results.length > 0 ? (
              <div className="grid gap-2">
                {results.map((p) => (
                  <Link
                    key={p._id}
                    href={`/product/${p.slug}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink/5"
                  >
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-ink/5">
                      {p.images?.[0] && (
                        <Image src={p.images[0]} alt={p.title} fill className="object-cover" sizes="56px" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{p.title}</p>
                      <p className="text-sm text-nova-600">{formatPrice(p.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {history.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">Recent</p>
                    <div className="flex flex-wrap gap-2">
                      {history.map((h) => (
                        <button key={h} onClick={() => submit(h)} className="chip gap-1">
                          <Clock className="h-3 w-3" /> {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/40">Trending</p>
                  <div className="flex flex-wrap gap-2">
                    {TRENDING.map((t) => (
                      <button key={t} onClick={() => submit(t)} className="chip">
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
