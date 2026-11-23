'use client';

import dynamic from 'next/dynamic';
import {
  attemptChunkRecovery,
  clearClientCachesAndRedirect,
  isChunkLoadError,
} from '@/lib/chunk-recovery';

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 py-2">
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-600 p-5 sm:p-7 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/80 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-sm sm:text-base font-bold tracking-wide">
            Memuat Dasbor Tikrar MTI...
          </span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-6 bg-white/20 rounded-lg w-48 animate-pulse" />
          <div className="h-4 bg-white/15 rounded-lg w-64 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
          <div className="h-2 bg-gray-200 rounded-full w-full animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
          <div className="h-2 bg-gray-200 rounded-full w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function DashboardLoadErrorFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
          Dasbor Gagal Dimuat
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
          Koneksi terputus atau terdapat pembaruan versi aplikasi. Silakan muat ulang halaman atau bersihkan cache browser Ukhti.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-green-900 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Muat Ulang Halaman
          </button>
          <button
            type="button"
            onClick={() => clearClientCachesAndRedirect('/login')}
            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Bersihkan Cache &amp; Login Ulang
          </button>
        </div>
      </div>
    </div>
  );
}

// Dynamic import with no SSR to prevent hydration issues, plus guarded chunk recovery
const DashboardContent = dynamic(
  () =>
    import('@/components/DashboardContent').catch((error) => {
      console.error('[Dashboard] Failed to load DashboardContent chunk:', error);
      if (isChunkLoadError(error)) {
        attemptChunkRecovery();
      }
      return { default: DashboardLoadErrorFallback };
    }),
  {
    ssr: false,
    loading: () => <DashboardLoadingSkeleton />,
  }
);

export default function Dashboard() {
  return <DashboardContent />;
}
