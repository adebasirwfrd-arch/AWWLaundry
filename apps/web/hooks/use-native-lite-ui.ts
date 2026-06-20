'use client';

import { useEffect, useState } from 'react';
import { isMobileAppWebView } from '@/lib/mobile-webview';

/**
 * Mode UI ringan untuk APK — tanpa animasi GSAP yang bisa membuat konten
 * tertinggal opacity:0 setelah navigasi/login.
 */
export function useNativeLiteUI() {
  const [lite, setLite] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isMobileAppWebView();
  });

  useEffect(() => {
    setLite(isMobileAppWebView());
  }, []);

  return lite;
}
