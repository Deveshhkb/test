'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Registers GSAP ScrollTrigger and wires up declarative parallax. Any element
 * with a `data-parallax` attribute (value = speed, e.g. "0.3") will move as the
 * user scrolls, creating depth without per-component boilerplate.
 */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const speed = parseFloat(el.dataset.parallax || '0.3');
        gsap.to(el, {
          yPercent: speed * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return <>{children}</>;
}
