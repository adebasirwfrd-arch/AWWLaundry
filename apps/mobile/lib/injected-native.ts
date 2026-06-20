/** JS disuntikkan sebelum konten load — tandai native app & sinkronkan viewport. */
export const NATIVE_BOOTSTRAP_JS = `
(function () {
  var root = document.documentElement;
  root.classList.add('native-app');
  root.setAttribute('data-native-app', 'awwlaundry');
  try {
    sessionStorage.setItem('aww-native-app', '1');
  } catch (e) {}

  function syncViewport() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    root.style.setProperty('--native-vw', w + 'px');
    root.style.setProperty('--native-vh', h + 'px');
    root.classList.toggle('native-landscape', w > h);
    root.classList.toggle('native-portrait', h >= w);
  }

  syncViewport();
  window.addEventListener('resize', syncViewport);
  window.addEventListener('orientationchange', function () {
    setTimeout(syncViewport, 50);
    setTimeout(syncViewport, 250);
  });
})();
true;
`;

/** Perbarui safe-area inset dari React Native (lebih akurat dari CSS env di WebView). */
export function buildSafeAreaInjectJs(insets: { top: number; bottom: number; left: number; right: number }) {
  return `
(function () {
  var r = document.documentElement;
  r.style.setProperty('--safe-top', '${insets.top}px');
  r.style.setProperty('--safe-right', '${insets.right}px');
  r.style.setProperty('--safe-bottom', '${insets.bottom}px');
  r.style.setProperty('--safe-left', '${insets.left}px');
})();
true;
`;
}
