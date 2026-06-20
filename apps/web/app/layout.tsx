import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import '@aww/design-tokens/css-variables.css';
import './globals.css';
import { Providers } from './providers';
import { SplashScreen } from '@/components/animations/splash-screen';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1E3A6E',
};

export const metadata: Metadata = {
  title: 'AWW Laundry — FRESH • CLEAN • FUN',
  description: 'Platform manajemen franchise laundry terbaik Indonesia',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AWW Laundry',
  },
};

const themeInitScript = `(function(){try{var r=document.documentElement;var ua=navigator.userAgent||'';if(ua.indexOf('AWWLaundry/')!==-1||new URLSearchParams(location.search).get('native')==='1'){r.classList.add('native-app');r.setAttribute('data-native-app','awwlaundry');try{sessionStorage.setItem('aww-native-app','1');}catch(e){}}else{try{if(sessionStorage.getItem('aww-native-app')==='1'){r.classList.add('native-app');r.setAttribute('data-native-app','awwlaundry');}}catch(e){}}var p=localStorage.getItem('aww-theme')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);r.classList.toggle('dark',d);r.setAttribute('data-theme',d?'dark':'light');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        <SplashScreen />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
