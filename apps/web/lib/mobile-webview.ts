export function isMobileAppWebView() {
  if (typeof window === 'undefined') return false;
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
