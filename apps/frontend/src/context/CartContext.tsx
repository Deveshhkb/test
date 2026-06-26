'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Cart, CartSummary } from '@/lib/types';
import { useAuth } from './AuthContext';

interface CartState {
  cart: Cart | null;
  summary: CartSummary;
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (payload: AddPayload) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<string>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<void>;
}

interface AddPayload {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  color?: string;
  size?: string;
}

const emptySummary: CartSummary = {
  itemsTotal: 0,
  discount: 0,
  shippingFee: 0,
  grandTotal: 0,
  itemCount: 0,
};

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [summary, setSummary] = useState<CartSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      setSummary(emptySummary);
      return;
    }
    try {
      const data = await api<{ cart: Cart; summary: CartSummary }>('/cart');
      setCart(data.cart);
      setSummary(data.summary);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const mutate = async (fn: () => Promise<{ cart: Cart; summary: CartSummary }>) => {
    setLoading(true);
    try {
      const data = await fn();
      setCart(data.cart);
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (payload: AddPayload) => {
    await mutate(() =>
      api('/cart', { method: 'POST', body: JSON.stringify(payload) })
    );
    setOpen(true);
  };

  const updateItem = (itemId: string, quantity: number) =>
    mutate(() =>
      api(`/cart/item/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) })
    );

  const removeItem = (itemId: string) =>
    mutate(() => api(`/cart/item/${itemId}`, { method: 'DELETE' }));

  const applyCoupon = async (code: string) => {
    const data = await api<{ cart: Cart; summary: CartSummary; message: string }>('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    setCart(data.cart);
    setSummary(data.summary);
    return data.message;
  };

  const removeCoupon = () =>
    mutate(() => api('/cart/coupon', { method: 'DELETE' }));

  return (
    <CartContext.Provider
      value={{ cart, summary, loading, open, setOpen, addItem, updateItem, removeItem, applyCoupon, removeCoupon, refresh }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
