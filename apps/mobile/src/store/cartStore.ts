import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuItem } from '@/api/types';

export interface CartLine {
  key: string; // menuItemId + variant + addOns → one line per unique customization
  menuItemId: string;
  name: string;
  imageUrl?: string;
  isVeg: boolean;
  variant?: string;
  addOns: { name: string; price: number }[];
  unitPrice: number;
  quantity: number;
}

interface CartState {
  restaurantId: string | null;
  restaurantName: string | null;
  lines: CartLine[];
  couponCode: string | null;
  addItem: (
    restaurant: { id: string; name: string },
    item: MenuItem,
    opts: { variant?: string; addOns: { name: string; price: number }[]; quantity: number },
  ) => 'added' | 'different_restaurant';
  changeQuantity: (key: string, delta: number) => void;
  setCoupon: (code: string | null) => void;
  clear: () => void;
  replaceCart: () => void;
}

const lineKey = (menuItemId: string, variant?: string, addOns: { name: string }[] = []) =>
  [menuItemId, variant ?? '', ...addOns.map((a) => a.name).sort()].join('|');

let pendingAdd: (() => void) | null = null;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantName: null,
      lines: [],
      couponCode: null,

      addItem: (restaurant, item, opts) => {
        const state = get();
        const doAdd = () => {
          const key = lineKey(item._id, opts.variant, opts.addOns);
          const unitPrice =
            (opts.variant
              ? item.variants.find((v) => v.name === opts.variant)?.price ?? item.basePrice
              : item.basePrice) + opts.addOns.reduce((s, a) => s + a.price, 0);

          set((s) => {
            const existing = s.lines.find((l) => l.key === key);
            const lines = existing
              ? s.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + opts.quantity } : l))
              : [
                  ...s.lines,
                  {
                    key,
                    menuItemId: item._id,
                    name: item.name,
                    imageUrl: item.imageUrl,
                    isVeg: item.isVeg,
                    variant: opts.variant,
                    addOns: opts.addOns,
                    unitPrice,
                    quantity: opts.quantity,
                  },
                ];
            return { lines, restaurantId: restaurant.id, restaurantName: restaurant.name };
          });
        };

        // One restaurant per cart — adding from another queues a "replace cart?" decision.
        if (state.restaurantId && state.restaurantId !== restaurant.id && state.lines.length > 0) {
          pendingAdd = () => { set({ lines: [], couponCode: null }); doAdd(); };
          return 'different_restaurant';
        }
        doAdd();
        return 'added';
      },

      changeQuantity: (key, delta) =>
        set((s) => {
          const lines = s.lines
            .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
            .filter((l) => l.quantity > 0);
          return lines.length === 0
            ? { lines, restaurantId: null, restaurantName: null, couponCode: null }
            : { lines };
        }),

      setCoupon: (couponCode) => set({ couponCode }),
      clear: () => set({ lines: [], restaurantId: null, restaurantName: null, couponCode: null }),
      replaceCart: () => { pendingAdd?.(); pendingAdd = null; },
    }),
    { name: 'savora-cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const useCartTotals = () =>
  useCartStore((s) => {
    const itemsTotal = s.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const itemCount = s.lines.reduce((sum, l) => sum + l.quantity, 0);
    return { itemsTotal, itemCount };
  });
