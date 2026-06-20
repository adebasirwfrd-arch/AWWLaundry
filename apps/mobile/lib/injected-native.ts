export const NATIVE_BOOTSTRAP_JS = `
(function () {
  var root = document.documentElement;
  root.classList.add('native-app');
  root.setAttribute('data-native-app', 'awwlaundry');
  try {
    sessionStorage.setItem('aww-native-app', '1');
  } catch (e) {}
})();
true;
`;
