import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

WebBrowser.maybeCompleteAuthSession();

const APP_URL = (Constants.expoConfig?.extra?.appUrl as string | undefined) ?? 'https://aww-laundry.vercel.app';
const APP_ORIGIN = APP_URL.replace(/\/$/, '');
const START_URL = `${APP_ORIGIN}/customer`;

type GoogleAuthMessage = {
  type: 'google-auth';
  callbackUrl?: string;
};

function isGoogleOAuthUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('accounts.google.com')) return true;
    if (parsed.hostname.includes('google.com') && parsed.pathname.includes('/oauth')) return true;
    return parsed.pathname.includes('/api/v1/auth/mobile-google');
  } catch {
    return false;
  }
}

function buildGoogleSignInUrl(callbackUrl: string) {
  const params = new URLSearchParams({ callbackUrl });
  return `${APP_ORIGIN}/api/v1/auth/mobile-google?${params.toString()}`;
}

export default function App() {
  const webRef = useRef<WebView>(null);
  const oauthInFlight = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

  const finishOAuth = useCallback((targetUrl: string) => {
    oauthInFlight.current = false;
    setLoading(true);
    webRef.current?.injectJavaScript(`window.location.replace(${JSON.stringify(targetUrl)}); true;`);
  }, []);

  const openGoogleAuth = useCallback(
    async (startUrl: string, callbackUrl: string) => {
      if (oauthInFlight.current) return;
      oauthInFlight.current = true;
      setLoading(true);

      const returnUrl = callbackUrl.startsWith('http') ? callbackUrl : `${APP_ORIGIN}${callbackUrl}`;

      try {
        const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
        if (result.type === 'success' && result.url) {
          finishOAuth(result.url);
          return;
        }
        if (result.type === 'cancel' || result.type === 'dismiss') {
          oauthInFlight.current = false;
          setLoading(false);
        }
      } catch {
        oauthInFlight.current = false;
        setLoading(false);
      }
    },
    [finishOAuth]
  );

  const handleWebMessage = useCallback(
    (raw: string) => {
      try {
        const data = JSON.parse(raw) as GoogleAuthMessage;
        if (data.type !== 'google-auth') return;
        const callbackUrl = data.callbackUrl?.startsWith('/') ? data.callbackUrl : '/customer';
        void openGoogleAuth(buildGoogleSignInUrl(callbackUrl), callbackUrl);
      } catch {
        // ignore malformed messages
      }
    },
    [openGoogleAuth]
  );

  const interceptOAuthNavigation = useCallback(
    (url: string) => {
      if (!isGoogleOAuthUrl(url)) return false;
      const parsed = new URL(url);
      const callbackUrl = parsed.searchParams.get('callbackUrl') ?? '/customer';
      void openGoogleAuth(url, callbackUrl);
      return true;
    },
    [openGoogleAuth]
  );

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

  const onNavigationStateChange = useCallback(
    (nav: WebViewNavigation) => {
      setCanGoBack(nav.canGoBack);
      if (Platform.OS === 'android') {
        interceptOAuthNavigation(nav.url);
      }
    },
    [interceptOAuthNavigation]
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" backgroundColor="#FAFAF8" />
        <WebView
          ref={webRef}
          source={{ uri: START_URL }}
          onNavigationStateChange={onNavigationStateChange}
          onShouldStartLoadWithRequest={(request) => !interceptOAuthNavigation(request.url)}
          onMessage={(event) => handleWebMessage(event.nativeEvent.data)}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows={false}
          originWhitelist={['https://*', 'http://localhost:*']}
          applicationNameForUserAgent="AWWLaundryApp"
          style={styles.webview}
        />
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#1E3A6E" />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
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
