import { notFound } from 'next/navigation';
import { temples, getTemple } from '@/data/content';
import { buildMetadata } from '@/lib/seo';
import { localize } from '@/lib/localize';
import TempleDetail from '@/components/views/TempleDetail';

export function generateStaticParams() {
  return temples.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const temple = getTemple(params.slug);
  if (!temple) return buildMetadata({ title: 'Temple', description: 'Temple details', path: `/temples/${params.slug}` });
  return buildMetadata({
    title: localize(temple.name, 'en'),
    description: localize(temple.description, 'en'),
    path: `/temples/${temple.slug}`,
    image: temple.coverImage,
  });
}

export default function Page({ params }: { params: { slug: string } }) {
  const temple = getTemple(params.slug);
  if (!temple) notFound();
  return <TempleDetail temple={temple} />;
}
