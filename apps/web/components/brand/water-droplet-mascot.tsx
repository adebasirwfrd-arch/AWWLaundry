'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Water droplet mascot from the AWW logo — animated SVG (GSAP).
 * Bounces, blinks, and floats. Used in empty states, loading, onboarding.
 */
export function WaterDropletMascot({
  className = 'h-32 w-32',
  wave = false,
}: {
  className?: string;
  wave?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.to('.mascot-body', {
        y: -8,
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        transformOrigin: 'center',
      });
      const blink = gsap.timeline({ repeat: -1, repeatDelay: 2.5 });
      blink.to('.mascot-eye', { scaleY: 0.1, duration: 0.08, transformOrigin: 'center' })
        .to('.mascot-eye', { scaleY: 1, duration: 0.08 });
      if (wave) {
        gsap.to('.mascot-arm', {
          rotation: 20,
          duration: 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          transformOrigin: '70% 30%',
        });
      }
    }, el);
    return () => ctx.revert();
  }, [wave]);

  return (
    <svg ref={ref} viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="droplet-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7FD4F0" />
          <stop offset="100%" stopColor="#4A90D9" />
        </linearGradient>
      </defs>
      <g className="mascot-body">
        <path
          d="M100 30 C100 30 150 95 150 130 A50 50 0 1 1 50 130 C50 95 100 30 100 30Z"
          fill="url(#droplet-grad)"
        />
        {/* glasses */}
        <circle cx="82" cy="125" r="18" fill="white" />
        <circle cx="120" cy="125" r="18" fill="white" />
        <rect x="98" y="122" width="6" height="4" rx="2" fill="#1E3A6E" />
        <circle cx="82" cy="125" r="18" fill="none" stroke="#1E3A6E" strokeWidth="3" />
        <circle cx="120" cy="125" r="18" fill="none" stroke="#1E3A6E" strokeWidth="3" />
        {/* eyes */}
        <circle className="mascot-eye" cx="82" cy="125" r="6" fill="#1E3A6E" />
        <circle className="mascot-eye" cx="120" cy="125" r="6" fill="#1E3A6E" />
        {/* smile */}
        <path d="M88 150 Q100 162 112 150" stroke="#1E3A6E" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* arm */}
        <path className="mascot-arm" d="M148 120 Q170 110 172 92" stroke="#4A90D9" strokeWidth="8" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
