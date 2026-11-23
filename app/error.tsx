'use client';

import { useEffect } from 'react';
import {
  attemptChunkRecovery,
  clearClientCachesAndRedirect,
  isChunkLoadError,
} from '@/lib/chunk-recovery';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AppError]', error);
    if (isChunkLoadError(error)) {
      attemptChunkRecovery();
    }
  }, [error]);

  const isChunk = isChunkLoadError(error);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          {isChunk ? 'Aplikasi Baru Saja Diperbarui' : 'Halaman Gagal Dimuat'}
        </h2>
        <p className="text-gray-600 mb-6 text-xs sm:text-sm leading-relaxed">
          {isChunk
            ? 'Terdapat pembaruan versi di server atau cache browser lama masih tersimpan. Silakan muat ulang halaman atau bersihkan cache.'
            : 'Terjadi kendala saat menampilkan halaman ini. Silakan coba muat ulang halaman atau bersihkan cache browser Ukhti.'}
        </p>

        {error?.message && (
          <div className="text-left bg-red-50/80 border border-red-200 rounded-2xl p-3.5 mb-6 text-xs text-red-900 font-mono overflow-auto max-h-32">
            <p className="font-bold text-red-950 mb-1">Detail:</p>
            <p className="whitespace-pre-wrap break-words">{error.message}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center gap-2.5">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-green-900 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            Muat Ulang Halaman
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Coba Lagi
          </button>
          <button
            type="button"
            onClick={() => clearClientCachesAndRedirect('/login')}
            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            Bersihkan Cache
          </button>
        </div>
      </div>
    </div>
  );
}
