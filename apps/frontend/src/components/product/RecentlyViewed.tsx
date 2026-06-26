'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ProductRail from '@/components/home/ProductRail';
import type { Product } from '@/lib/types';

export default function RecentlyViewed({ excludeSlug }: { excludeSlug?: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let slugs: string[] = [];
    try {
      slugs = JSON.parse(localStorage.getItem('nova_recent') || '[]');
    } catch {
      slugs = [];
    }
    const filtered = slugs.filter((s) => s !== excludeSlug).slice(0, 8);
    if (!filtered.length) return;

    Promise.all(
      filtered.map((slug) =>
        api<{ product: Product }>(`/products/${slug}`)
          .then((d) => d.product)
          .catch(() => null)
      )
    ).then((list) => setProducts(list.filter(Boolean) as Product[]));
  }, [excludeSlug]);

  if (!products.length) return null;

  return <ProductRail title="Recently Viewed" products={products} />;
}
