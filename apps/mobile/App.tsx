import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { getNativeUserAgent } from './lib/user-agent';
import { buildSafeAreaInjectJs, NATIVE_BOOTSTRAP_JS } from './lib/injected-native';

const APP_URL = (Constants.expoConfig?.extra?.appUrl as string | undefined) ?? 'https://aww-laundry.vercel.app';
const APP_ORIGIN = APP_URL.replace(/\/$/, '');
const START_URL = `${APP_ORIGIN}/?native=1`;

function AppContent() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void SystemUI.setBackgroundColorAsync('#1E3A6E');
    void NavigationBar.setBackgroundColorAsync('#FFFFFF');
    void NavigationBar.setButtonStyleAsync('dark');
  }, []);

  // Sinkronkan safe-area & ukuran layar ke CSS WebView setiap rotasi/resize.
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <WebView
        ref={webRef}
        source={{ uri: START_URL }}
        userAgent={getNativeUserAgent()}
        injectedJavaScriptBeforeContentLoaded={NATIVE_BOOTSTRAP_JS}
        onNavigationStateChange={onNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => {
          setLoading(false);
          webRef.current?.injectJavaScript(buildSafeAreaInjectJs(insets));
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
        originWhitelist={['https://*', 'http://localhost:*']}
        style={styles.webview}
      />
      {loading && (
        <View style={styles.loader}>
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
