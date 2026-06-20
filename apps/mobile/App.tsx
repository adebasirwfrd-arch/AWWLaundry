import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const APP_URL = (Constants.expoConfig?.extra?.appUrl as string | undefined) ?? 'https://aww-laundry.vercel.app';
const START_URL = `${APP_URL.replace(/\/$/, '')}/customer`;

export default function App() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="dark" backgroundColor="#FAFAF8" />
        <WebView
          ref={webRef}
          source={{ uri: START_URL }}
          onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          setSupportMultipleWindows={false}
          originWhitelist={['https://*', 'http://localhost:*']}
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
