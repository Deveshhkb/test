import { useEffect, useRef, useState } from 'react';

/** Animates a number towards `target` (used for win / balance counters). */
export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const v0 = from.current;
    if (v0 === target) return;
    if (target < v0 || durationMs <= 0) {
      from.current = target;
      setValue(target);
      return;
    }
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(v0 + (target - v0) * eased);
      from.current = v;
      setValue(v);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, durationMs]);
  return value;
}
