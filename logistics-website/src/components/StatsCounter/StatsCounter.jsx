import { useEffect, useRef, useState } from 'react';
import styles from './StatsCounter.module.css';

/** Single stat that counts up from 0 once it scrolls into view. */
function StatItem({ Icon, value, suffix, label }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || started.current) return;
          started.current = true;

          if (reduce) {
            setCount(value);
            return;
          }

          const duration = 1600;
          const start = performance.now();
          const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            // easeOutCubic for a natural deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className={styles.item}>
      <div className={styles.icon} aria-hidden="true">
        <Icon />
      </div>
      <div className={styles.number}>
        {count.toLocaleString()}
        <span className={styles.suffix}>{suffix}</span>
      </div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}

export default function StatsCounter({ stats = [] }) {
  return (
    <div className={styles.grid}>
      {stats.map((stat) => (
        <StatItem key={stat.id} {...stat} />
      ))}
    </div>
  );
}
