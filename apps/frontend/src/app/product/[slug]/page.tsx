import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { safeApi } from '@/lib/api';
import type { Product } from '@/lib/types';
import ProductDetail from '@/components/product/ProductDetail';
import ReviewsSection from '@/components/product/ReviewsSection';
import ProductRail from '@/components/home/ProductRail';
import RecentlyViewed from '@/components/product/RecentlyViewed';

interface ProductResponse {
  product: Product | null;
  related: Product[];
}

async function fetchProduct(slug: string): Promise<ProductResponse> {
  return safeApi<ProductResponse>(`/products/${slug}`, { product: null, related: [] }, 120);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { product } = await fetchProduct(slug);
  if (!product) return { title: 'Product not found' };

  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description?.slice(0, 160),
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.title,
      description: product.description?.slice(0, 160),
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { product, related } = await fetchProduct(slug);
  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images,
    brand: { '@type': 'Brand', name: product.brand?.name || 'Clothinary' },
    aggregateRating:
      product.ratingCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.ratingAverage,
            reviewCount: product.ratingCount,
          }
        : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability:
        product.inStock !== false
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container-nova py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetail product={product} />
      <ReviewsSection productId={product._id} />
      {related.length > 0 && <ProductRail title="You may also like" products={related} />}
      <RecentlyViewed excludeSlug={product.slug} />
    </div>
  );
}
