import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'AWW Laundry',
  slug: 'aww-laundry',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  scheme: 'awwlaundry',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#FAFAF8',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.awwlaundry.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FAFAF8',
    },
    package: 'com.awwlaundry.app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: '56aa0cad-497c-4e5f-af20-1d866f93e8b7',
    },
    appUrl: process.env.EXPO_PUBLIC_APP_URL ?? 'https://aww-laundry.vercel.app',
  },
  owner: 'adebasir78',
};

export default config;
