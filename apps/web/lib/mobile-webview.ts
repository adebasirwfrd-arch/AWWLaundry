export function isMobileAppWebView() {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

export function requestNativeGoogleAuth(callbackUrl: string) {
  const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (msg: string) => void } })
    .ReactNativeWebView;
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify({ type: 'google-auth', callbackUrl }));
  return true;
}
