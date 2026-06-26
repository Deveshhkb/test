'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2, ShoppingBag } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/lib/utils';

export default function WishlistPage() {
  const { products, toggle } = useWishlist();
  const { addItem } = useCart();

  return (
    <div>
      <h1 className="text-2xl font-black">My Wishlist</h1>
      {products.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-ink/10 p-10 text-center">
          <p className="text-ink/50">Your wishlist is empty.</p>
          <Link href="/collections/best-sellers" className="btn-primary mt-4">
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => (
            <div key={p._id} className="rounded-2xl border border-ink/10 p-3">
              <Link href={`/product/${p.slug}`} className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-ink/5">
                {p.images?.[0] && <Image src={p.images[0]} alt={p.title} fill className="object-cover" sizes="300px" />}
              </Link>
              <div className="mt-3">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="text-sm font-bold">{formatPrice(p.price)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() =>
                    addItem({ productId: p._id, size: p.sizes?.[0] || '', color: p.colors?.[0]?.name || '', quantity: 1 })
                  }
                  className="btn-primary flex-1 !py-2 text-xs"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Move to Bag
                </button>
                <button
                  onClick={() => toggle(p._id)}
                  aria-label="Remove"
                  className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 hover:border-accent hover:text-accent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
