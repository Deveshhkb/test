'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Star, Truck, ShieldCheck, RotateCcw, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, discountPercent, cn } from '@/lib/utils';
import ProductGallery from './ProductGallery';
import type { Product } from '@/lib/types';

export default function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem, setOpen } = useCart();
  const { has, toggle } = useWishlist();
  const { user } = useAuth();

  const [size, setSize] = useState(product.sizes?.[0] || '');
  const [color, setColor] = useState(product.colors?.[0]?.name || '');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const off = product.discountPercent || discountPercent(product.price, product.compareAtPrice);
  const wished = has(product._id);

  // Track recently viewed in localStorage.
  useEffect(() => {
    try {
      const key = 'nova_recent';
      const list: string[] = JSON.parse(localStorage.getItem(key) || '[]');
      const next = [product.slug, ...list.filter((s) => s !== product.slug)].slice(0, 8);
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, [product.slug]);

  const resolveVariant = () =>
    product.variants?.find((v) => v.size === size && v.color === color);

  const requireAuth = () => {
    if (!user) {
      router.push(`/login?redirect=/product/${product.slug}`);
      return false;
    }
    return true;
  };

  const handleAdd = async () => {
    if (!requireAuth()) return;
    if (product.sizes?.length && !size) return alert('Please select a size.');
    setAdding(true);
    try {
      const variant = resolveVariant();
      await addItem({ productId: product._id, variantId: variant?._id, size, color, quantity: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!requireAuth()) return;
    if (product.sizes?.length && !size) return alert('Please select a size.');
    const variant = resolveVariant();
    await addItem({ productId: product._id, variantId: variant?._id, size, color, quantity: 1 });
    setOpen(false);
    router.push('/checkout');
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <ProductGallery images={product.images} title={product.title} />

      <div>
        {product.brand && (
          <p className="text-sm font-semibold uppercase tracking-wide text-nova-600">
            {product.brand.name}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{product.title}</h1>

        {product.ratingCount > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-md bg-green-600 px-2 py-0.5 text-sm font-semibold text-white">
              {product.ratingAverage.toFixed(1)} <Star className="h-3 w-3 fill-white" />
            </span>
            <span className="text-sm text-ink/50">{product.ratingCount} ratings</span>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <span className="text-3xl font-black">{formatPrice(product.price)}</span>
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <>
              <span className="text-lg text-ink/40 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
              <span className="rounded-md bg-accent/10 px-2 py-0.5 text-sm font-bold text-accent">
                {off}% OFF
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-ink/40">Inclusive of all taxes</p>

        {/* Colors */}
        {product.colors?.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold">
              Color: <span className="text-ink/60">{color}</span>
            </p>
            <div className="flex gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setColor(c.name)}
                  aria-label={c.name}
                  className={cn(
                    'h-9 w-9 rounded-full border-2 transition',
                    color === c.name ? 'border-ink ring-2 ring-ink/20' : 'border-ink/15'
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sizes */}
        {product.sizes?.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Select Size</p>
              <button className="text-xs font-medium text-nova-600">Size Guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={cn(
                    'h-11 min-w-11 rounded-xl border px-3 text-sm font-semibold transition',
                    size === s ? 'border-ink bg-ink text-white' : 'border-ink/15 hover:border-ink'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className={cn('mt-4 text-sm font-medium', product.inStock !== false ? 'text-green-600' : 'text-accent')}>
          {product.inStock !== false ? '● In stock — ready to ship' : '● Out of stock'}
        </p>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button onClick={handleAdd} disabled={adding} className="btn-primary flex-1">
            {added ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              'Add to Bag'
            )}
          </button>
          <button onClick={handleBuyNow} className="btn-accent flex-1">
            Buy Now
          </button>
          <button
            onClick={() => (user ? toggle(product._id) : router.push('/login'))}
            aria-label="Wishlist"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-ink/15 hover:border-ink"
          >
            <Heart className={cn('h-5 w-5', wished && 'fill-accent text-accent')} />
          </button>
        </div>

        {/* Trust badges */}
        <div className="mt-6 grid grid-cols-3 gap-3 border-y border-ink/10 py-4 text-center">
          <Badge icon={<Truck className="h-5 w-5" />} label="Free shipping over ₹999" />
          <Badge icon={<RotateCcw className="h-5 w-5" />} label="7-day easy returns" />
          <Badge icon={<ShieldCheck className="h-5 w-5" />} label="Secure payments" />
        </div>

        {/* Description & specs */}
        <div className="mt-6 space-y-5">
          <div>
            <h3 className="mb-1 text-sm font-bold uppercase tracking-wide">Description</h3>
            <p className="text-sm leading-relaxed text-ink/70">{product.description}</p>
          </div>
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Specifications</h3>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-ink/50">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-xs text-ink/60">
      <span className="text-nova-600">{icon}</span>
      {label}
    </div>
  );
}
