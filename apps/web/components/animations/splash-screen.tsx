'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { AnimatedLogo } from '@/components/brand/animated-logo';
import { RainbowBubbleField } from '@/components/animations/rainbow-bubble-field';
import { useNativeLiteUI } from '@/hooks/use-native-lite-ui';
import { isMobileAppWebView } from '@/lib/mobile-webview';

/**
 * Splash screen — logo reveal with rainbow bubbles, shown once per session.
 * Auto-dismisses after the intro timeline completes.
 */
export function SplashScreen() {
  const lite = useNativeLiteUI();
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lite || isMobileAppWebView()) return;
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    if (path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot-password') || path.startsWith('/reset-password')) return;
    const seen = sessionStorage.getItem('aww-splash-seen');
    if (seen) return;
    setVisible(true);
    sessionStorage.setItem('aww-splash-seen', '1');
  }, [lite]);

  // Safety net: apa pun yang terjadi dengan animasi, splash wajib hilang.
  useEffect(() => {
    if (!visible) return;
    const fallback = window.setTimeout(() => setVisible(false), 4000);
    return () => window.clearTimeout(fallback);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setVisible(false),
      });
      if (reduced) {
        tl.to(el, { opacity: 0, duration: 0.3, delay: 0.8 });
        return;
      }
      tl.from('.splash-logo', { scale: 0.5, opacity: 0, duration: 1, ease: 'back.out(1.7)' })
        .from('.splash-tag', { opacity: 0, y: 12, duration: 0.5 }, '-=0.3')
        .to('.splash-logo', { scale: 1.04, duration: 0.6, ease: 'sine.inOut' })
        .to(el, { opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.4');
    }, el);
    return () => ctx.revert();
  }, [visible]);

  if (lite || !visible) return null;

  return (
    <div
      ref={ref}
      data-aww-splash
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-aww-brand-hero"
    >
      <RainbowBubbleField density="high" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="splash-logo">
          <AnimatedLogo width={340} height={180} priority />
        </div>
        <p className="splash-tag mt-2 text-sm font-bold tracking-[0.3em] text-brand-pink">
          FRESH • CLEAN • FUN
        </p>
      </div>
    </div>
  );
}
