'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from 0 to `end` once the element scrolls into view.
 * Uses requestAnimationFrame with an ease-out curve for a premium feel.
 */
export function useCountUp(end: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        setValue(Math.floor(eased * end));
        if (progress < 1) requestAnimationFrame(tick);
        else setValue(end);
      };
      requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return { value, ref };
}
