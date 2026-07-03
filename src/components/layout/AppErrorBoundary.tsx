import React from 'react';
import { ErrorBoundary } from '#src/components/shared/ErrorBoundary.js';

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
