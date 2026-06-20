import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  InteractionManager,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { getNativeUserAgent } from './lib/user-agent';
import { buildNativeCleanupJs, buildSafeAreaInjectJs, NATIVE_BOOTSTRAP_JS } from './lib/injected-native';

const APP_URL = (Constants.expoConfig?.extra?.appUrl as string | undefined) ?? 'https://aww-laundry.vercel.app';
const APP_ORIGIN = APP_URL.replace(/\/$/, '');
const START_URL = `${APP_ORIGIN}/?native=1`;
const LOADER_TIMEOUT_MS = 8000;

function AppContent() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const initialLoadDone = useRef(false);
  const loaderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const hideLoader = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      setShowLoader(false);
    });
    setShowLoader(false);
  }, []);

  const clearLoaderTimer = useCallback(() => {
    if (loaderTimer.current) {
      clearTimeout(loaderTimer.current);
      loaderTimer.current = null;
    }
  }, []);

  const armLoaderFailsafe = useCallback(() => {
    clearLoaderTimer();
    loaderTimer.current = setTimeout(() => {
      setShowLoader(false);
      initialLoadDone.current = true;
    }, LOADER_TIMEOUT_MS);
  }, [clearLoaderTimer]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void SystemUI.setBackgroundColorAsync('#1E3A6E');
    void NavigationBar.setBackgroundColorAsync('#FFFFFF');
    void NavigationBar.setButtonStyleAsync('dark');
  }, []);

  useEffect(() => {
    armLoaderFailsafe();
    return clearLoaderTimer;
  }, [armLoaderFailsafe, clearLoaderTimer]);

  useEffect(() => {
    webRef.current?.injectJavaScript(buildSafeAreaInjectJs(insets));
  }, [insets.top, insets.bottom, insets.left, insets.right, width, height]);

  const onAndroidBack = useCallback(() => {
    if (canGoBack) {
      webRef.current?.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', onAndroidBack);
    return () => sub.remove();
  }, [onAndroidBack]);

  const onNavigationStateChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  const onWebLoadEnd = useCallback(() => {
    clearLoaderTimer();
    hideLoader();
    initialLoadDone.current = true;
    webRef.current?.injectJavaScript(buildSafeAreaInjectJs(insets));
    webRef.current?.injectJavaScript(buildNativeCleanupJs());
  }, [clearLoaderTimer, hideLoader, insets]);

  const onWebLoadStart = useCallback(() => {
    // Hanya tampilkan overlay pada muat awal — navigasi SPA tidak perlu menutup layar.
    if (!initialLoadDone.current) {
      setShowLoader(true);
      armLoaderFailsafe();
    }
  }, [armLoaderFailsafe]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <WebView
        ref={webRef}
        source={{ uri: START_URL }}
        userAgent={getNativeUserAgent()}
        injectedJavaScriptBeforeContentLoaded={NATIVE_BOOTSTRAP_JS}
        onNavigationStateChange={onNavigationStateChange}
        onLoadStart={onWebLoadStart}
        onLoadEnd={onWebLoadEnd}
        onError={() => {
          clearLoaderTimer();
          hideLoader();
        }}
        onHttpError={() => {
          clearLoaderTimer();
          hideLoader();
        }}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled={false}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptCanOpenWindowsAutomatically
        setSupportMultipleWindows={false}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        overScrollMode="never"
        allowsLinkPreview={false}
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        startInLoadingState={false}
        originWhitelist={['https://*', 'http://localhost:*']}
        style={styles.webview}
      />
      {showLoader && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#1E3A6E" />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A6E',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,250,248,0.85)',
  },
});
