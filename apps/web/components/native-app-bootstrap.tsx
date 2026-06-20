'use client';

import { useEffect } from 'react';
import { isMobileAppWebView } from '@/lib/mobile-webview';

export function NativeAppBootstrap() {
  useEffect(() => {
    if (!isMobileAppWebView()) return;
    document.documentElement.classList.add('native-app');
    document.documentElement.setAttribute('data-native-app', 'awwlaundry');
    try {
      sessionStorage.setItem('aww-native-app', '1');
    } catch {
      // ignore storage errors
    }
  }, []);

  return null;
}
