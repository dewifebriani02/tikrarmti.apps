'use client';

import { useEffect } from 'react';
import { attemptChunkRecovery, isChunkLoadError } from '@/lib/chunk-recovery';

export default function GlobalErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);

      // Ignore specific browser extension errors
      if (event.reason?.message?.includes('message channel closed')) {
        event.preventDefault();
        return;
      }

      if (isChunkLoadError(event.reason)) {
        attemptChunkRecovery();
      }
    };

    // Handle runtime errors
    const handleError = (event: ErrorEvent) => {
      // Ignore hydration errors in development (they're handled by React)
      if (
        event.error?.message?.includes('Hydration failed') ||
        event.error?.message?.includes('hydrating this Suspense boundary')
      ) {
        event.preventDefault();
        return;
      }

      console.error('Runtime error:', event.error);

      // Ignore specific browser extension errors
      if (event.error?.message?.includes('message channel closed')) {
        event.preventDefault();
        return;
      }

      if (isChunkLoadError(event.error || event.message)) {
        attemptChunkRecovery();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
