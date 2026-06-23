'use client';

import { useCountdown } from '@/hooks/useCountdown';
import { cn } from '@/utils';

interface Props {
  targetIso: string;
  compact?: boolean;
  light?: boolean;
}

export default function Countdown({ targetIso, compact = false, light = false }: Props) {
  const { days, hours, minutes, seconds, total } = useCountdown(targetIso);

  if (total <= 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        Happening now
      </span>
    );
  }

  const units = [
    { label: 'Days', value: days },
    { label: 'Hrs', value: hours },
    { label: 'Min', value: minutes },
    { label: 'Sec', value: seconds },
  ];

  return (
    <div className={cn('flex gap-2', compact ? '' : 'gap-3')}>
      {units.map((u) => (
        <div
          key={u.label}
          className={cn(
            'flex flex-col items-center rounded-xl px-2.5 py-2',
            light ? 'bg-white/15 text-white' : 'bg-gold-50 text-royal-950',
            compact ? 'min-w-[48px]' : 'min-w-[64px]',
          )}
        >
          <span className={cn('font-bold tabular-nums', compact ? 'text-lg' : 'text-2xl')}>
            {String(u.value).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
