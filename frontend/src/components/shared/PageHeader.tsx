import Image from 'next/image';

interface Props {
  title: string;
  subtitle?: string;
  image?: string;
}

const DEFAULT = 'https://images.unsplash.com/photo-1609920658906-8223bd289001?auto=format&fit=crop&w=1600&q=70';

/** Reusable inner-page hero banner with overlay. */
export default function PageHeader({ title, subtitle, image = DEFAULT }: Props) {
  return (
    <header className="relative flex h-[42vh] min-h-[280px] items-center justify-center overflow-hidden">
      <Image src={image} alt={title} fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-hero-gradient" />
      <div className="container-px relative z-10 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-white/85">{subtitle}</p>}
      </div>
    </header>
  );
}
