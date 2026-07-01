'use client';

import { Users, Package, Star } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';

function Stat({ end, suffix, label, icon }: { end: number; suffix?: string; label: string; icon: React.ReactNode }) {
  const [value, ref] = useCountUp(end);
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-nova-50 text-nova-600">{icon}</span>
      <div>
        <p className="text-sm font-bold leading-none">
          <span ref={ref}>{value.toLocaleString('en-IN')}</span>
          {suffix}
        </p>
        <p className="text-[11px] text-ink/50">{label}</p>
      </div>
    </div>
  );
}

/** Live social-proof stats with count-up animation. */
export default function SocialProof() {
  return (
    <div className="space-y-3">
      <Stat end={15000} suffix="+" label="Happy customers" icon={<Users className="h-4 w-4" />} />
      <Stat end={3500} label="Orders today" icon={<Package className="h-4 w-4" />} />
      <Stat end={49} suffix="★ (4.9)" label="Average rating" icon={<Star className="h-4 w-4" />} />
    </div>
  );
}
