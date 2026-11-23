'use client';

import React, { useEffect } from 'react';
import { attemptChunkRecovery, isChunkLoadError } from '@/lib/chunk-recovery';

interface ErrorHandlersProps {
  children: React.ReactNode;
}

export default function ErrorHandlers({ children }: ErrorHandlersProps) {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      if (isChunkLoadError(event.reason)) {
        attemptChunkRecovery();
        return;
      }
      event.preventDefault();
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
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

  return <>{children}</>;
}
