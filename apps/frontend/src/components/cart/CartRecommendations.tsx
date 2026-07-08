'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import ProductRail from '@/components/home/ProductRail';
import type { Product } from '@/lib/types';

/**
 * "You may also like" rail for the cart. Pulls trending products (falling back
 * to newest) and hides anything already in the bag.
 */
export default function CartRecommendations({ excludeIds = [] }: { excludeIds?: string[] }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    api<{ products: Product[] }>('/products?collection=trending&limit=12')
      .then((d) => (d.products.length ? d : api<{ products: Product[] }>('/products?sort=newest&limit=12')))
      .then((d) => active && setProducts(d.products))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const exclude = new Set(excludeIds);
  const list = products.filter((p) => !exclude.has(p._id)).slice(0, 10);
  if (!list.length) return null;

  return <ProductRail title="You may also like" products={list} viewAllHref="/collections/trending" />;
}
