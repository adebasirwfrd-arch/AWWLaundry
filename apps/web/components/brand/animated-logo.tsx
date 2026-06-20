'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Animated brand logo — the official AWW Laundry PNG with floating rainbow
 * bubbles orbiting it. Used on splash, login, and headers.
 */
export function AnimatedLogo({
  className = '',
  width = 280,
  height = 150,
  bubbles = true,
  priority = false,
}: {
  className?: string;
  width?: number;
  height?: number;
  bubbles?: boolean;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !bubbles) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.to('.logo-img', {
        y: -6,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to('.logo-orbit-bubble', {
        y: 'random(-14, 14)',
        x: 'random(-10, 10)',
        duration: 'random(2, 3.5)',
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: 0.15,
      });
    }, el);
    return () => ctx.revert();
  }, [bubbles]);

  const COLORS = ['#FF5C9A', '#FFD23F', '#4ECDC4', '#9B59B6', '#6BCB77'];

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {bubbles &&
        COLORS.map((c, i) => (
          <span
            key={i}
            className="logo-orbit-bubble pointer-events-none absolute rounded-full"
            style={{
              width: `${10 + i * 3}px`,
              height: `${10 + i * 3}px`,
              background: `radial-gradient(circle at 30% 30%, #fff, ${c})`,
              boxShadow: `0 0 10px ${c}66`,
              left: `${[5, 88, 12, 80, 50][i]}%`,
              top: `${[10, 18, 78, 70, -6][i]}%`,
              opacity: 0.85,
            }}
          />
        ))}
      <Image
        src="/brand/logo.png"
        alt="AWW Laundry"
        width={width}
        height={height}
        priority={priority}
        className="logo-img relative h-auto w-full object-contain drop-shadow-xl"
      />
    </div>
  );
}
