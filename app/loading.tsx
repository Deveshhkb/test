import { GiLotusFlower } from 'react-icons/gi';

export default function Loading() {
  return (
    <div className="grid min-h-[80vh] place-items-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <span className="grid h-16 w-16 animate-spin-slow place-items-center rounded-full border-4 border-dashed border-gold-400">
          <GiLotusFlower className="animate-glow text-2xl text-saffron-500" />
        </span>
        <p className="text-sm font-semibold uppercase tracking-widest text-royal-900/50">Loading…</p>
      </div>
    </div>
  );
}
