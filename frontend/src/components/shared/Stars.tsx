import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

export default function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center text-secondary ${className}`} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        if (rating >= i) return <FaStar key={i} className="h-3.5 w-3.5" />;
        if (rating >= i - 0.5) return <FaStarHalfAlt key={i} className="h-3.5 w-3.5" />;
        return <FaRegStar key={i} className="h-3.5 w-3.5" />;
      })}
    </span>
  );
}
