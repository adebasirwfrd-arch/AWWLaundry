'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Reveals children on scroll into view (fade + rise + slight scale).
 */
export function ScrollReveal({
  children,
  className = '',
  y = 40,
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: once ? 'play none none none' : 'play none none reverse',
          },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [y, delay, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
