import React from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="p-4 bg-red-50 text-red-800 rounded-lg">
      <h2 className="text-lg font-bold">系統發生錯誤</h2>
      <p className="mt-2 text-sm">{error instanceof Error ? error.message : String(error)}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
      >
        重試
      </button>
    </div>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onError={(error) => {
        ErrorFactory.capture(error);
        showToast.error('系統發生錯誤，已自動記錄');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
