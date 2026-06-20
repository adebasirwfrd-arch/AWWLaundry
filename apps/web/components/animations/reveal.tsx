'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Staggered reveal — animates direct children up + fade on mount.
 * Wrap dashboards, lists, forms for a premium entrance.
 */
export function Reveal({
  children,
  className = '',
  stagger = 0.08,
  y = 24,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.from(el.children, {
        y,
        opacity: 0,
        duration: 0.6,
        stagger,
        delay,
        ease: 'power3.out',
        clearProps: 'all',
      });
    }, el);
    return () => ctx.revert();
  }, [stagger, y, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
