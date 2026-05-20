import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { TaskProvider } from './hooks/useTasks';
import './index.css';

Sentry.init({
  dsn: "https://49371df75e33c477f7c16b7bf1c25b9c@o4511421206953984.ingest.us.sentry.io/4511421218357248",
  sendDefaultPii: true,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
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
