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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
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
