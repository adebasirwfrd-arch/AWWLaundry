'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isMobileAppWebView } from '@/lib/mobile-webview';

/** Hapus overlay/opacity yang nyangkut setelah navigasi di WebView Android. */
function resetStuckNativeOverlays() {
  document.querySelectorAll('[data-aww-splash]').forEach((el) => el.remove());

  document.querySelectorAll('[data-page-transition-content]').forEach((el) => {
    const node = el as HTMLElement;
    node.style.opacity = '1';
    node.style.visibility = 'visible';
    node.style.transform = 'none';
    node.style.pointerEvents = 'auto';
  });

  document.querySelectorAll('main, [data-native-scroll-main]').forEach((el) => {
    const node = el as HTMLElement;
    node.style.opacity = '1';
    node.style.visibility = 'visible';
  });

  const burst = document.getElementById('aww-burst-layer');
  if (burst) burst.innerHTML = '';
}

export function NativeOverlayGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isMobileAppWebView()) return;

    resetStuckNativeOverlays();
    const t1 = window.setTimeout(resetStuckNativeOverlays, 100);
    const t2 = window.setTimeout(resetStuckNativeOverlays, 500);
    const t3 = window.setTimeout(resetStuckNativeOverlays, 1500);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [pathname]);

  return null;
}
