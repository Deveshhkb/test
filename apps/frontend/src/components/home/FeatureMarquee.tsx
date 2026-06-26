const ITEMS = [
  'FREE SHIPPING OVER ₹999',
  'EASY 7-DAY RETURNS',
  '100% SECURE PAYMENTS',
  'ORIGINAL IN-HOUSE DESIGNS',
  'COD AVAILABLE',
  'NEW DROPS EVERY WEEK',
];

export default function FeatureMarquee() {
  return (
    <div className="overflow-hidden border-y border-ink/10 bg-nova-50 py-3">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-xs font-bold uppercase tracking-widest text-nova-800">
        {[...ITEMS, ...ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            {item}
            <span className="text-nova-300">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
