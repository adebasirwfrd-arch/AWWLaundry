'use client';

import { useEffect } from 'react';
import gsap from 'gsap';

const RAINBOW = ['#FF5C9A', '#FF8C2A', '#FFD23F', '#6BCB77', '#4ECDC4', '#4A90D9', '#9B59B6'];

/**
 * Global click burst — every pointer click pops a small cluster of rainbow
 * bubbles at the cursor. Adds the "everything reacts" feel from the brand guide.
 */
export function ClickBubbleBurst() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let layer = document.getElementById('aww-burst-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'aww-burst-layer';
      Object.assign(layer.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '9999',
        overflow: 'hidden',
      });
      document.body.appendChild(layer);
    }

    function handler(e: PointerEvent) {
      const target = e.target as HTMLElement;
      // Skip when typing in inputs
      if (target.closest('input, textarea, select')) return;

      const burstLayer = document.getElementById('aww-burst-layer');
      if (!burstLayer) return;

      const n = 7;
      for (let i = 0; i < n; i++) {
        const b = document.createElement('div');
        const size = gsap.utils.random(6, 14);
        const color = RAINBOW[i % RAINBOW.length];
        Object.assign(b.style, {
          position: 'absolute',
          left: `${e.clientX}px`,
          top: `${e.clientY}px`,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, #fff, ${color})`,
          boxShadow: `0 0 8px ${color}88`,
          transform: 'translate(-50%, -50%)',
        });
        burstLayer.appendChild(b);

        const angle = (Math.PI * 2 * i) / n + gsap.utils.random(-0.3, 0.3);
        const dist = gsap.utils.random(28, 56);
        gsap.to(b, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist - 10,
          opacity: 0,
          scale: 0.3,
          duration: gsap.utils.random(0.5, 0.8),
          ease: 'power2.out',
          onComplete: () => b.remove(),
        });
      }
    }

    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  return null;
}
