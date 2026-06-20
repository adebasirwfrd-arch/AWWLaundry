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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${plusJakarta.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <SplashScreen />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
