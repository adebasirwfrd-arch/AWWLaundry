/** UA khusus dari APK AWW Laundry (lihat apps/mobile/lib/user-agent.ts). */
export function isAwwNativeUserAgent(ua?: string) {
  const value = ua ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return value.includes('AWWLaundry/');
}

export function isMobileAppWebView() {
  if (typeof window === 'undefined') return false;

  // Paling andal: UA custom APK, berlaku sejak request pertama (termasuk setelah OAuth redirect).
  if (isAwwNativeUserAgent()) return true;

  if ((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView) return true;
  if (document.documentElement.classList.contains('native-app')) return true;
  if (document.documentElement.getAttribute('data-native-app') === 'awwlaundry') return true;

  try {
    if (sessionStorage.getItem('aww-native-app') === '1') return true;
    if (new URLSearchParams(window.location.search).get('native') === '1') return true;
  } catch {
    // ignore storage / URL errors
  }

  return false;
}
