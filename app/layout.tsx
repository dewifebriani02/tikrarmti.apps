import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SWRProvider } from '@/lib/swr/provider'
import AppLayout from '@/components/AppLayout'
import GlobalErrorHandler from '@/components/GlobalErrorHandler'
import ErrorHandlers from '@/components/ErrorHandlers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { AutoReloadProvider } from '@/components/AutoReloadProvider'
import { GlobalFaqWidget } from '@/components/faq/GlobalFaqWidget'

export const metadata: Metadata = {
  title: 'Tikrar MTI Apps',
  description: 'Markaz Tikrar Indonesia - Aplikasi Tahfidz Quran Digital',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#15803d',
  viewportFit: 'cover',
  colorScheme: 'light',
}

const pwaSelfHealScript = `
(function() {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (var i = 0; i < regs.length; i++) {
          regs[i].unregister();
        }
      }).catch(function() {});
    }
    window.addEventListener('error', function(event) {
      var target = event.target || event.srcElement;
      var isScriptOrCss = target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK');
      var src = (target && (target.src || target.href)) || '';
      if (isScriptOrCss && src.indexOf('/_next/static/') !== -1) {
        var key = 'mti_early_chunk_reload';
        var last = parseInt(sessionStorage.getItem(key) || '0', 10);
        var now = Date.now();
        if (!last || now - last > 15000) {
          sessionStorage.setItem(key, String(now));
          if ('caches' in window) {
            caches.keys().then(function(names) {
              return Promise.all(names.map(function(n) { return caches.delete(n); }));
            }).finally(function() {
              var url = new URL(window.location.href);
              url.searchParams.set('_v', String(now));
              window.location.replace(url.toString());
            });
          } else {
            var url = new URL(window.location.href);
            url.searchParams.set('_v', String(now));
            window.location.replace(url.toString());
          }
        }
      }
    }, true);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: pwaSelfHealScript }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ErrorBoundary>
          <ErrorHandlers>
            <GlobalErrorHandler />
            <SWRProvider>
              <AutoReloadProvider />
              <AppLayout>
                {children}
              </AppLayout>
              <GlobalFaqWidget />
            </SWRProvider>
            <Toaster position="top-center" richColors />
          </ErrorHandlers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
