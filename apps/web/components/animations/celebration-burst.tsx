'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { createPortal } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';

const RAINBOW = ['#FF5C9A', '#FF8C2A', '#FFD23F', '#6BCB77', '#4ECDC4', '#4A90D9', '#9B59B6'];

interface CelebrationBurstProps {
  show: boolean;
  title?: string;
  subtitle?: string;
  onDone?: () => void;
}

/**
 * Full-screen rainbow bubble explosion for transaction success (payment,
 * order ready). The signature "celebration" moment from the brand guide.
 */
export function CelebrationBurst({ show, title, subtitle, onDone }: CelebrationBurstProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const layer = ref.current;
    const card = cardRef.current;
    if (!layer) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (!reduced) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const count = 60;
        for (let i = 0; i < count; i++) {
          const b = document.createElement('div');
          const size = gsap.utils.random(8, 26);
          const color = RAINBOW[i % RAINBOW.length];
          Object.assign(b.style, {
            position: 'absolute',
            left: `${cx}px`,
            top: `${cy}px`,
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #fff, ${color})`,
            boxShadow: `0 0 12px ${color}88`,
            transform: 'translate(-50%,-50%)',
          });
          layer.appendChild(b);
          const angle = gsap.utils.random(0, Math.PI * 2);
          const dist = gsap.utils.random(120, 420);
          gsap.to(b, {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            opacity: 0,
            scale: gsap.utils.random(0.2, 0.8),
            rotation: gsap.utils.random(-180, 180),
            duration: gsap.utils.random(1, 1.8),
            ease: 'power3.out',
            onComplete: () => b.remove(),
          });
        }
      }

      if (card) {
        gsap.fromTo(
          card,
          { scale: 0.6, opacity: 0, y: 20 },
          { scale: 1, opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.8)' }
        );
      }
    }, layer);

    const t = setTimeout(() => onDone?.(), 2200);
    return () => {
      clearTimeout(t);
      ctx.revert();
    };
  }, [show, onDone]);

  if (!show || typeof document === 'undefined') return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center">
      <div ref={ref} className="absolute inset-0" />
      <div
        ref={cardRef}
        className="relative flex flex-col items-center gap-3 rounded-3xl bg-white/95 px-10 py-8 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-aww-payment shadow-aww-glow-rainbow">
          <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={2.5} />
        </div>
        {title && <p className="font-display text-2xl font-bold text-brand-navy">{title}</p>}
        {subtitle && <p className="text-brand-navy/60">{subtitle}</p>}
      </div>
    </div>,
    document.body
  );
}
