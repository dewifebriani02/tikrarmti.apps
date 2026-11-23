'use client';

import { useEffect } from 'react';
import {
  attemptChunkRecovery,
  clearClientCachesAndRedirect,
  isChunkLoadError,
} from '@/lib/chunk-recovery';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
    if (isChunkLoadError(error)) {
      attemptChunkRecovery();
    }
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: '#f9fafb',
          color: '#111827',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08)',
            padding: '28px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>
            Halaman Tidak Dapat Dimuat
          </h2>
          <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.6, margin: '0 0 20px' }}>
            Kemungkinan ada pembaruan aplikasi atau cache browser lama masih tersimpan. Klik{' '}
            <strong>Muat Ulang Halaman</strong> atau <strong>Bersihkan Cache</strong> di bawah ini.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: '#14532d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Muat Ulang Halaman
            </button>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => clearClientCachesAndRedirect('/login')}
              style={{
                backgroundColor: '#fffbeb',
                color: '#78350f',
                border: '1px solid #fde68a',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Bersihkan Cache
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
