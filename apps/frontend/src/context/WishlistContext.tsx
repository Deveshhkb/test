'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';
import { useAuth } from './AuthContext';

interface WishlistState {
  ids: Set<string>;
  products: Product[];
  toggle: (productId: string) => Promise<boolean>;
  has: (productId: string) => boolean;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistState | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!user) {
      setProducts([]);
      setIds(new Set());
      return;
    }
    try {
      const data = await api<{ wishlist: { products: Product[] } }>('/wishlist');
      const list = data.wishlist?.products || [];
      setProducts(list);
      setIds(new Set(list.map((p) => p._id)));
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async (productId: string) => {
    const data = await api<{ added: boolean }>('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
    setIds((prev) => {
      const next = new Set(prev);
      if (data.added) next.add(productId);
      else next.delete(productId);
      return next;
    });
    refresh();
    return data.added;
  };

  const has = (productId: string) => ids.has(productId);

  return (
    <WishlistContext.Provider value={{ ids, products, toggle, has, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
