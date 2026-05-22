import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as ErrorMonitor from "@sentry/react";
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { TaskProvider } from './hooks/useTasks';
import { setupGlobalErrorHandling } from './lib/errorHandling';
import { ErrorReporter } from './lib/errorReporter';
import './index.css';

setupGlobalErrorHandling();

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
        <Toaster position="bottom-center" richColors closeButton expand={true} />
        <TaskProvider>
          <App />
        </TaskProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}
