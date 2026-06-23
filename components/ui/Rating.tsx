import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { cn } from '@/utils';

interface Props {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Rating({ value, count, size = 'sm', className }: Props) {
  const stars = Array.from({ length: 5 }).map((_, i) => {
    const diff = value - i;
    if (diff >= 1) return <FaStar key={i} />;
    if (diff >= 0.5) return <FaStarHalfAlt key={i} />;
    return <FaRegStar key={i} />;
  });

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className={cn('flex text-gold-500', size === 'sm' ? 'text-sm' : 'text-base')}>
        {stars}
      </div>
      <span className="text-sm font-semibold text-royal-900">{value.toFixed(1)}</span>
      {typeof count === 'number' && (
        <span className="text-xs text-royal-900/50">({count.toLocaleString('en-IN')})</span>
      )}
    </div>
  );
}
