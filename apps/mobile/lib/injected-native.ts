/** JS disuntikkan sebelum konten load — tandai native app & sinkronkan viewport. */
export const NATIVE_BOOTSTRAP_JS = `
(function () {
  var root = document.documentElement;
  root.classList.add('native-app');
  root.setAttribute('data-native-app', 'awwlaundry');
  try {
    sessionStorage.setItem('aww-native-app', '1');
  } catch (e) {}

  function resetStuckOverlays() {
    document.querySelectorAll('[data-aww-splash]').forEach(function (el) { el.remove(); });
    document.querySelectorAll('[data-page-transition-content], main, [data-native-scroll-main]').forEach(function (el) {
      el.style.opacity = '1';
      el.style.visibility = 'visible';
      el.style.transform = 'none';
      el.style.pointerEvents = 'auto';
    });
    var burst = document.getElementById('aww-burst-layer');
    if (burst) burst.innerHTML = '';
  }

  function syncViewport() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    root.style.setProperty('--native-vw', w + 'px');
    root.style.setProperty('--native-vh', h + 'px');
    root.classList.toggle('native-landscape', w > h);
    root.classList.toggle('native-portrait', h >= w);
    resetStuckOverlays();
  }

  syncViewport();
  window.addEventListener('resize', syncViewport);
  window.addEventListener('orientationchange', function () {
    setTimeout(syncViewport, 50);
    setTimeout(syncViewport, 250);
  });
  window.addEventListener('pageshow', resetStuckOverlays);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) resetStuckOverlays();
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

/** Bersihkan overlay yang nyangkut setelah load/navigasi. */
export function buildNativeCleanupJs() {
  return `
(function () {
  document.querySelectorAll('[data-aww-splash]').forEach(function (el) { el.remove(); });
  document.querySelectorAll('[data-page-transition-content], main, [data-native-scroll-main]').forEach(function (el) {
    el.style.opacity = '1';
    el.style.visibility = 'visible';
    el.style.transform = 'none';
    el.style.pointerEvents = 'auto';
  });
  var burst = document.getElementById('aww-burst-layer');
  if (burst) burst.innerHTML = '';
})();
true;
`;
}
