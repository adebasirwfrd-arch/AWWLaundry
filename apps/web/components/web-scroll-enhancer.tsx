'use client';

import { useEffect } from 'react';
import { isMobileAppWebView } from '@/lib/mobile-webview';

const SCROLL_STEP = 120;

/** Tombol panah keyboard untuk scroll halaman di web (bukan APK). */
export function WebScrollEnhancer() {
  useEffect(() => {
    if (isMobileAppWebView()) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      let dx = 0;
      let dy = 0;

      switch (event.key) {
        case 'ArrowDown':
          dy = SCROLL_STEP;
          break;
        case 'ArrowUp':
          dy = -SCROLL_STEP;
          break;
        case 'ArrowRight':
          dx = SCROLL_STEP;
          break;
        case 'ArrowLeft':
          dx = -SCROLL_STEP;
          break;
        case 'PageDown':
          dy = window.innerHeight * 0.85;
          break;
        case 'PageUp':
          dy = -window.innerHeight * 0.85;
          break;
        case ' ':
          if (event.shiftKey) {
            dy = -window.innerHeight * 0.85;
          } else {
            dy = window.innerHeight * 0.85;
          }
          break;
        default:
          return;
      }

      event.preventDefault();
      window.scrollBy({ left: dx, top: dy, behavior: 'smooth' });
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
