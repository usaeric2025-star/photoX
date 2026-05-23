import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as ErrorMonitor from "@sentry/react";
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { TaskProvider } from '@/hooks';
import { setupGlobalErrorHandling } from './lib/errorHandling';
import { ErrorReporter } from './lib/errorReporter';
import { setupDevErrorHelper } from './lib/devErrorHelper';
import './index.css';

setupGlobalErrorHandling();
setupDevErrorHelper();

// 挂载全局错误捕获
if (!import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    (window as any).__LAST_ERROR__ = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString(),
    };
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    (window as any).__LAST_ERROR__ = {
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
    };
  });
}

ErrorMonitor.init({
  dsn: "https://5056f30974504ff1becd3b5da98a68af@app.glitchtip.com/23689",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});

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

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Toaster position="bottom-center" richColors closeButton expand={false} visibleToasts={2} swipeToDismiss={true} />
        <TaskProvider>
          <App />
        </TaskProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}
