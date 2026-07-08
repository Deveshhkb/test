'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Cart, CartItem, CartSummary, Product } from '@/lib/types';
import { useAuth } from './AuthContext';

interface CartState {
  cart: Cart | null;
  summary: CartSummary;
  loading: boolean;
  open: boolean;
  isGuest: boolean;
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
  // A lightweight product snapshot so the guest (offline) cart can render
  // without another round-trip. Ignored for logged-in users.
  product?: { title: string; slug: string; image?: string; price: number };
}

const emptySummary: CartSummary = {
  itemsTotal: 0,
  discount: 0,
  shippingFee: 0,
  grandTotal: 0,
  itemCount: 0,
};

const GUEST_KEY = 'nova_guest_cart';

/** Totals for the guest cart — mirrors the backend's summarize() rules. */
function summarize(items: CartItem[]): CartSummary {
  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = itemsTotal > 999 || itemsTotal === 0 ? 0 : 49;
  return {
    itemsTotal,
    discount: 0, // coupons require an account
    shippingFee,
    grandTotal: itemsTotal + shippingFee,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
  };
}

function readGuestCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeGuestCart(items: CartItem[]) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `g_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const CartContext = createContext<CartState | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [summary, setSummary] = useState<CartSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const isGuest = !user;

  // Track the previous auth state so we can merge the guest cart exactly once
  // when the user logs in.
  const wasLoggedIn = useRef<boolean | null>(null);

  const setGuestState = useCallback((items: CartItem[]) => {
    setCart({ _id: 'guest', items });
    setSummary(summarize(items));
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setGuestState(readGuestCart());
      return;
    }
    try {
      const data = await api<{ cart: Cart; summary: CartSummary }>('/cart');
      setCart(data.cart);
      setSummary(data.summary);
    } catch {
      /* ignore */
    }
  }, [user, setGuestState]);

  // Push any locally-stored guest items into the server cart, then clear them.
  const mergeGuestCart = useCallback(async () => {
    const items = readGuestCart();
    if (!items.length) return;
    for (const it of items) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await api('/cart', {
          method: 'POST',
          body: JSON.stringify({
            productId: it.product._id,
            variantId: it.variantId ?? null,
            quantity: it.quantity,
            color: it.color || '',
            size: it.size || '',
          }),
        });
      } catch {
        /* skip items that fail (e.g. deleted product) */
      }
    }
    writeGuestCart([]);
  }, []);

  useEffect(() => {
    const loggedIn = Boolean(user);
    // Transition guest -> logged in: merge the guest cart first.
    if (loggedIn && wasLoggedIn.current === false) {
      (async () => {
        await mergeGuestCart();
        await refresh();
      })();
    } else {
      refresh();
    }
    wasLoggedIn.current = loggedIn;
  }, [user, mergeGuestCart, refresh]);

  // ---- Logged-in mutation helper ----
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
    if (user) {
      await mutate(() =>
        api('/cart', {
          method: 'POST',
          body: JSON.stringify({
            productId: payload.productId,
            variantId: payload.variantId ?? null,
            quantity: payload.quantity ?? 1,
            color: payload.color || '',
            size: payload.size || '',
          }),
        })
      );
      setOpen(true);
      return;
    }

    // Guest: mutate the local cart.
    const snap = payload.product;
    const qty = payload.quantity ?? 1;
    const items = readGuestCart();
    const existing = items.find(
      (i) =>
        i.product._id === payload.productId &&
        String(i.variantId ?? '') === String(payload.variantId ?? '') &&
        (i.size || '') === (payload.size || '') &&
        (i.color || '') === (payload.color || '')
    );
    if (existing) {
      existing.quantity += qty;
    } else {
      const product = {
        _id: payload.productId,
        title: snap?.title || 'Item',
        slug: snap?.slug || '',
        images: snap?.image ? [snap.image] : [],
      } as unknown as Product;
      items.push({
        _id: newId(),
        product,
        variantId: payload.variantId ?? undefined,
        sku: '',
        color: payload.color || '',
        size: payload.size || '',
        quantity: qty,
        price: snap?.price ?? 0,
      });
    }
    writeGuestCart(items);
    setGuestState(items);
    setOpen(true);
  };

  const updateItem = async (itemId: string, quantity: number) => {
    if (user) {
      await mutate(() =>
        api(`/cart/item/${itemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) })
      );
      return;
    }
    let items = readGuestCart();
    if (quantity <= 0) {
      items = items.filter((i) => i._id !== itemId);
    } else {
      items = items.map((i) => (i._id === itemId ? { ...i, quantity } : i));
    }
    writeGuestCart(items);
    setGuestState(items);
  };

  const removeItem = async (itemId: string) => {
    if (user) {
      await mutate(() => api(`/cart/item/${itemId}`, { method: 'DELETE' }));
      return;
    }
    const items = readGuestCart().filter((i) => i._id !== itemId);
    writeGuestCart(items);
    setGuestState(items);
  };

  const applyCoupon = async (code: string) => {
    if (!user) throw new Error('Please log in to apply a coupon.');
    const data = await api<{ cart: Cart; summary: CartSummary; message: string }>('/cart/coupon', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    setCart(data.cart);
    setSummary(data.summary);
    return data.message;
  };

  const removeCoupon = async () => {
    if (!user) return;
    await mutate(() => api('/cart/coupon', { method: 'DELETE' }));
  };

  return (
    <CartContext.Provider
      value={{ cart, summary, loading, open, isGuest, setOpen, addItem, updateItem, removeItem, applyCoupon, removeCoupon, refresh }}
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
