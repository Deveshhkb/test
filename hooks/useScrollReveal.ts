'use client';

import { useEffect, useRef } from 'react';

interface Options {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Lightweight scroll-reveal hook built on IntersectionObserver. Adds the
 * `is-visible` class to the element when it enters the viewport. Pair with the
 * `.reveal` utility classes in globals.css for a dependency-free fade-up.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = '0px 0px -10% 0px',
  once = true,
}: Options = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return ref;
}
