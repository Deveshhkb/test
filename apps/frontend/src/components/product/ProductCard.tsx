'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Star } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, discountPercent, cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { has, toggle } = useWishlist();
  const { addItem } = useCart();
  const { user } = useAuth();
  const wished = has(product._id);
  const off = product.discountPercent || discountPercent(product.price, product.compareAtPrice);

  const onWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    await toggle(product._id);
  };

  const onQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    await addItem({
      productId: product._id,
      size: product.sizes?.[0] || '',
      color: product.colors?.[0]?.name || '',
      quantity: 1,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.35, delay: (index % 4) * 0.05 }}
      className="group"
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink/5">
          {product.images?.[0] && (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {off > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
              {off}% OFF
            </span>
          )}
          <button
            onClick={onWishlist}
            aria-label="Toggle wishlist"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow transition hover:scale-110"
          >
            <Heart className={cn('h-4 w-4', wished ? 'fill-accent text-accent' : 'text-ink')} />
          </button>

          <button
            onClick={onQuickAdd}
            className="absolute inset-x-3 bottom-3 translate-y-3 rounded-full bg-ink py-2.5 text-xs font-semibold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          >
            Quick Add
          </button>
        </div>
      </Link>

      <div className="mt-3 px-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{product.title}</p>
          {product.ratingCount > 0 && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs text-ink/60">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {product.ratingAverage.toFixed(1)}
            </span>
          )}
        </div>
        {product.brand && <p className="text-xs text-ink/40">{product.brand.name}</p>}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold">{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <span className="text-xs text-ink/40 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
