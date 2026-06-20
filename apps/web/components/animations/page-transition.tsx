'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { isMobileAppWebView } from '@/lib/mobile-webview';

const RAINBOW = ['#FF5C9A', '#FF8C2A', '#FFD23F', '#6BCB77', '#4ECDC4', '#4A90D9', '#9B59B6'];

/**
 * Page transition — on every route change, a wave of rainbow bubbles sweeps
 * across the screen and the new content fades up. Inspired by premium apps
 * where navigation feels alive.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    // Di app native, lewati animasi fade supaya konten dijamin terlihat (tidak stuck transparan).
    if (reduced || isMobileAppWebView()) return;
    const overlay = overlayRef.current;
    const content = contentRef.current;
    if (!overlay || !content) return;

    const ctx = gsap.context(() => {
      // Spawn bubbles for the sweep
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
        .set(overlay, { display: 'none' })
        .fromTo(
          content,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
          '-=0.7'
        );
    });

    return () => ctx.revert();
  }, [pathname, reduced]);

  return (
    <>
      <div
        ref={overlayRef}
        aria-hidden="true"
        style={{ display: 'none' }}
        className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
      />
      <div ref={contentRef}>{children}</div>
    </>
  );
}
