import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { showToast } from '@/lib/ui/toast';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

function GlobalErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="p-4 bg-red-50 text-red-800 rounded-lg">
      <h2 className="text-lg font-bold">系統發生錯誤</h2>
      <p className="mt-2 text-sm">{error.message}</p>
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
      onError={(error, info) => {
        ErrorFactory.handleError(error, '系統級錯誤', info);
        showToast.error('系統發生錯誤，已自動記錄');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
