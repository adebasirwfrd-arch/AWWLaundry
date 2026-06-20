'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useNativeLiteUI } from '@/hooks/use-native-lite-ui';

const RAINBOW = ['#FF5C9A', '#FF8C2A', '#FFD23F', '#6BCB77', '#4ECDC4', '#4A90D9', '#9B59B6'];

/**
 * Transisi halaman web. Di APK native, hanya render children tanpa GSAP
 * agar konten tidak pernah tertinggal opacity:0 (penyebab layar transparan/stuck).
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lite = useNativeLiteUI();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lite) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const overlay = overlayRef.current;
    if (!overlay) return;

    const ctx = gsap.context(() => {
      overlay.innerHTML = '';
      const count = window.innerWidth < 768 ? 14 : 26;
      for (let i = 0; i < count; i++) {
        const b = document.createElement('div');
        const size = gsap.utils.random(20, 70);
        const color = RAINBOW[Math.floor(Math.random() * RAINBOW.length)];
        Object.assign(b.style, {
          position: 'absolute',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          left: `${gsap.utils.random(0, 100)}%`,
          bottom: `-${size}px`,
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), ${color})`,
          boxShadow: `0 0 16px ${color}66`,
        });
        overlay.appendChild(b);
      }

      const tl = gsap.timeline();
      tl.set(overlay, { display: 'block' })
        .fromTo(
          overlay.children,
          { y: 0, opacity: 0, scale: 0.4 },
          {
            y: () => -window.innerHeight - 120,
            opacity: 1,
            scale: 1,
            duration: 0.9,
            stagger: { each: 0.02, from: 'random' },
            ease: 'power2.out',
          }
        )
        .to(overlay.children, { opacity: 0, duration: 0.3 }, '-=0.4')
        .set(overlay, { display: 'none' });
    });

    return () => ctx.revert();
  }, [pathname, lite]);

  return (
    <div data-page-transition-content className="contents">
      {!lite && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          style={{ display: 'none' }}
          className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
        />
      )}
      {children}
    </div>
  );
}
