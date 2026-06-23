import Link from 'next/link';
import Image from 'next/image';
import { FiChevronRight } from 'react-icons/fi';
import Particles from '@/components/ui/Particles';

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  image?: string;
  crumbs?: Crumb[];
}

export default function PageHero({
  title,
  subtitle,
  image = 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=1920&q=80',
  crumbs = [],
}: Props) {
  return (
    <section className="relative flex min-h-[52vh] items-center overflow-hidden pt-24">
      <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-royal-950/80 via-royal-950/60 to-royal-950/85" />
      <Particles count={16} color="bg-gold-300/40" />

      <div className="container relative z-10 py-12 text-center text-white">
        <nav className="mb-5 flex items-center justify-center gap-1.5 text-sm text-white/70">
          <Link href="/" className="transition-colors hover:text-gold-300">
            Home
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5">
              <FiChevronRight className="text-white/40" />
              {c.href ? (
                <Link href={c.href} className="transition-colors hover:text-gold-300">
                  {c.label}
                </Link>
              ) : (
                <span className="text-gold-300">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <h1 className="font-display text-4xl font-bold leading-tight text-shadow-lg md:text-6xl">
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-white/80">{subtitle}</p>}
      </div>
    </section>
  );
}
