'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Washing machine with a winking face — derived from the "W" in the AWW logo.
 * The drum spins and soap bubbles tumble. Used for the "washing" status.
 */
export function WashingMachine({
  className = 'h-24 w-24',
  active = true,
}: {
  className?: string;
  active?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.to('.wm-drum-inner', {
        rotation: 360,
        duration: 2.5,
        repeat: -1,
        ease: 'none',
        transformOrigin: 'center',
      });
      gsap.to('.wm-machine', {
        x: 1.5,
        duration: 0.12,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to('.wm-bubble', {
        y: -6,
        opacity: 0.4,
        duration: 1,
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
        ease: 'sine.inOut',
      });
    }, el);
    return () => ctx.revert();
  }, [active]);

  return (
    <svg ref={ref} viewBox="0 0 120 120" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wm-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5BC0EB" />
          <stop offset="100%" stopColor="#4A90D9" />
        </linearGradient>
        <linearGradient id="wm-water" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A0E9FF" />
          <stop offset="100%" stopColor="#4ECDC4" />
        </linearGradient>
      </defs>
      <g className="wm-machine">
        <rect x="20" y="14" width="80" height="92" rx="14" fill="url(#wm-body)" />
        <rect x="20" y="14" width="80" height="22" rx="11" fill="#1E3A6E" opacity="0.18" />
        <circle cx="34" cy="25" r="3" fill="#FFD23F" />
        <circle cx="46" cy="25" r="3" fill="#FF5C9A" />
        <rect x="70" y="22" width="22" height="6" rx="3" fill="white" opacity="0.8" />
        {/* drum */}
        <circle cx="60" cy="68" r="30" fill="white" />
        <circle cx="60" cy="68" r="26" fill="url(#wm-water)" />
        <g className="wm-drum-inner">
          <circle className="wm-bubble" cx="60" cy="52" r="5" fill="white" opacity="0.85" />
          <circle className="wm-bubble" cx="72" cy="70" r="4" fill="white" opacity="0.7" />
          <circle className="wm-bubble" cx="50" cy="78" r="6" fill="white" opacity="0.8" />
          <circle className="wm-bubble" cx="68" cy="60" r="3" fill="white" opacity="0.6" />
        </g>
        <circle cx="60" cy="68" r="26" fill="none" stroke="#1E3A6E" strokeWidth="3" opacity="0.5" />
        {/* winking face */}
        <path d="M50 64 q3 -3 6 0" stroke="#1E3A6E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="68" cy="63" r="2.5" fill="#1E3A6E" />
        <path d="M54 74 q6 5 12 0" stroke="#1E3A6E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
