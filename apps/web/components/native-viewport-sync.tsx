'use client';

import { useEffect } from 'react';
import { isMobileAppWebView } from '@/lib/mobile-webview';

function syncNativeViewport() {
  const root = document.documentElement;
  const w = window.innerWidth;
  const h = window.innerHeight;
  root.style.setProperty('--native-vw', `${w}px`);
  root.style.setProperty('--native-vh', `${h}px`);
  root.classList.toggle('native-landscape', w > h);
  root.classList.toggle('native-portrait', h >= w);
}

/** Cadangan sinkron viewport jika injeksi WebView belum jalan (navigasi client-side). */
export function NativeViewportSync() {
  useEffect(() => {
    if (!isMobileAppWebView()) return;

    syncNativeViewport();
    window.addEventListener('resize', syncNativeViewport);
    window.addEventListener('orientationchange', () => {
      setTimeout(syncNativeViewport, 50);
      setTimeout(syncNativeViewport, 250);
    });

    return () => {
      window.removeEventListener('resize', syncNativeViewport);
    };
  }, []);

  return null;
}
