import React, {StrictMode, useState} from 'react';
import {createRoot} from 'react-dom/client';
import { Toaster, toast } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { TaskProvider } from './hooks/useTasks';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';


// Global error logging
window.onerror = (message, source, lineno, colno, error) => {
  console.error(`Unhandled Error: ${message} at ${source}:${lineno}:${colno}`);
  return false;
};

window.onunhandledrejection = (event) => {
  console.error(`Unhandled Promise Rejection: ${event.reason}`);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="bottom-center" richColors closeButton expand={true} />
      <ErrorBoundary>
          <TaskProvider>
              <App />
          </TaskProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
