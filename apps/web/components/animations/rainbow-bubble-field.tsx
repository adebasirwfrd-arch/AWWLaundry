'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const RAINBOW = ['#FF5C9A', '#FF8C2A', '#FFD23F', '#6BCB77', '#4ECDC4', '#4A90D9', '#9B59B6'];

interface RainbowBubbleFieldProps {
  count?: number;
  className?: string;
  density?: 'low' | 'normal' | 'high';
}

/**
 * Multi-layer floating rainbow bubble background (GSAP particle system).
 * 3 depth layers: large slow iridescent, medium drift, small sparkle.
 */
export function RainbowBubbleField({ count, className = '', density = 'normal' }: RainbowBubbleFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const base = density === 'high' ? 1.4 : density === 'low' ? 0.6 : 1;
      const maxBubbles = count ?? Math.round((window.innerWidth < 768 ? 18 : 36) * base);

      const layers = [
        { sizeMin: 60, sizeMax: 130, opMin: 0.18, opMax: 0.4, dur: 7, blur: 1, share: 0.2 },
        { sizeMin: 26, sizeMax: 56, opMin: 0.25, opMax: 0.5, dur: 5, blur: 0.4, share: 0.35 },
        { sizeMin: 8, sizeMax: 22, opMin: 0.4, opMax: 0.7, dur: 3.5, blur: 0, share: 0.45 },
      ];

      layers.forEach((layer) => {
        const n = Math.floor(maxBubbles * layer.share);
        for (let i = 0; i < n; i++) {
          const bubble = document.createElement('div');
          bubble.className = 'pointer-events-none absolute rounded-full';
          const size = gsap.utils.random(layer.sizeMin, layer.sizeMax);
          const color = RAINBOW[Math.floor(Math.random() * RAINBOW.length)];
          Object.assign(bubble.style, {
            width: `${size}px`,
            height: `${size}px`,
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), ${color}aa 55%, ${color}33 100%)`,
            boxShadow: `0 4px 24px ${color}33, inset 0 2px 6px rgba(255,255,255,0.6)`,
            left: `${gsap.utils.random(0, 100)}%`,
            top: `${gsap.utils.random(0, 100)}%`,
            opacity: String(gsap.utils.random(layer.opMin, layer.opMax)),
            filter: layer.blur ? `blur(${layer.blur}px)` : 'none',
          });
          container.appendChild(bubble);

          gsap.to(bubble, {
            y: `random(-${layer.dur * 12}, ${layer.dur * 12})`,
            x: `random(-${layer.dur * 8}, ${layer.dur * 8})`,
            duration: gsap.utils.random(layer.dur * 0.8, layer.dur * 1.3),
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            delay: gsap.utils.random(0, 3),
          });
          gsap.to(bubble, {
            scale: gsap.utils.random(0.85, 1.15),
            duration: gsap.utils.random(2.5, 4),
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
          });
        }
      });
    }, container);

    return () => ctx.revert();
  }, [count, density]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
