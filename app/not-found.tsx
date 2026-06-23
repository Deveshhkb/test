import Link from 'next/link';
import { GiLotusFlower } from 'react-icons/gi';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <section className="grid min-h-[80vh] place-items-center bg-gradient-to-b from-royal-950 to-royal-900 px-4 text-center text-white">
      <div>
        <GiLotusFlower className="mx-auto animate-float text-7xl text-gold-400" />
        <h1 className="mt-6 font-display text-7xl font-bold text-gold-gradient">404</h1>
        <h2 className="mt-2 text-2xl font-bold">Path Not Found</h2>
        <p className="mx-auto mt-3 max-w-md text-white/70">
          The sacred page you seek has wandered off the trail. Let us guide you back.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href="/">Return Home</ButtonLink>
          <Link href="/temples" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
            Explore Temples
          </Link>
        </div>
      </div>
    </section>
  );
}
