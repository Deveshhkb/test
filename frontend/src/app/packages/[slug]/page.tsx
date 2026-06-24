import { notFound } from 'next/navigation';
import { packages, getPackage } from '@/data/content';
import { buildMetadata } from '@/lib/seo';
import { localize } from '@/lib/localize';
import PackageDetail from '@/components/views/PackageDetail';

export function generateStaticParams() {
  return packages.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const pkg = getPackage(params.slug);
  if (!pkg) return buildMetadata({ title: 'Package', description: 'Tour package', path: `/packages/${params.slug}` });
  return buildMetadata({
    title: localize(pkg.title, 'en'),
    description: localize(pkg.summary, 'en'),
    path: `/packages/${pkg.slug}`,
    image: pkg.coverImage,
    keywords: ['Ayodhya Tour Packages', ...pkg.destinations],
  });
}

export default function Page({ params }: { params: { slug: string } }) {
  const pkg = getPackage(params.slug);
  if (!pkg) notFound();
  return <PackageDetail pkg={pkg} />;
}
