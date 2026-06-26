'use client';

import { useRef, type ReactNode, type ElementType } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade';

const OFFSETS: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
  fade: {},
};

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  direction?: Direction;
  delay?: number;
  /** Stagger direct children instead of animating the wrapper as a whole. */
  stagger?: boolean;
  className?: string;
}

/**
 * GSAP + ScrollTrigger scroll-reveal. Animates the element (or its children,
 * when `stagger`) into view once, as it enters the viewport.
 */
export default function Reveal({
  children,
  as: Tag = 'div',
  direction = 'up',
  delay = 0,
  stagger = false,
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const targets = stagger ? Array.from(el.children) : el;
      gsap.from(targets, {
        autoAlpha: 0,
        ...OFFSETS[direction],
        duration: 0.7,
        delay,
        ease: 'power3.out',
        stagger: stagger ? 0.08 : 0,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
