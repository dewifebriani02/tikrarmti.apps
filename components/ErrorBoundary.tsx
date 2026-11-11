'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; reset: () => void; errorInfo?: React.ErrorInfo }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ errorInfo });

    // Otomatis reload jika terjadi ChunkLoadError akibat deployment / update versi
    if (typeof window !== 'undefined') {
      const msg = error?.message || '';
      const isChunkError =
        error?.name === 'ChunkLoadError' ||
        msg.includes('Loading chunk') ||
        msg.includes('Failed to fetch dynamically imported module');

      if (isChunkError) {
        const key = 'last_chunk_error_reload';
        const last = parseInt(sessionStorage.getItem(key) || '0', 10);
        const now = Date.now();
        if (now - last > 10000) {
          sessionStorage.setItem(key, now.toString());
          console.warn('[ErrorBoundary] ChunkLoadError terdeteksi setelah deployment. Memuat ulang halaman...');
          window.location.reload();
        }
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          reset={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error?: Error; reset: () => void; errorInfo?: React.ErrorInfo }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center p-8 max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Oops, terjadi kesalahan</h2>
        <p className="text-gray-600 mb-6 text-xs sm:text-sm leading-relaxed">
          Sistem mendeteksi kendala pada pemuatan halaman ini. Hal ini biasanya terjadi saat server baru saja diperbarui atau koneksi terputus sesaat.
        </p>

        {error?.message && (
          <div className="text-left bg-red-50/80 border border-red-200 rounded-2xl p-4 mb-6 text-xs text-red-900 font-mono overflow-auto max-h-40">
            <p className="font-bold text-red-950 mb-1">Rincian Kendala:</p>
            <p className="whitespace-pre-wrap">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-2.5">
          <button
            onClick={() => window.location.reload()}
            className="bg-green-900 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-95"
          >
            Muat Ulang Halaman
          </button>
          <button
            onClick={reset}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95"
          >
            Coba Lagi
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95"
          >
            Ke Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
