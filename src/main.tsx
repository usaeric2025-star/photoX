import { createStaleTime } from '@/shared/freshnessSchema';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { TaskProvider } from '@/hooks';
import { setupGlobalErrorHandling } from './lib/errorHandling';
import { reportError } from './lib/errorTracker';
import { queryClient, persister } from './lib/queryClient';
import { setupDevErrorHelper } from './lib/devErrorHelper';
import './index.css';
import { clientEnv } from './shared/envSchema';

if (clientEnv.DEV) {
  import('./lib/resizeObserverPolyfill');
}

setupGlobalErrorHandling();
setupDevErrorHelper();

// 挂载全局错误捕获
if (!clientEnv.DEV) {
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

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container, {
    onCaughtError: (error, errorInfo) => {
      reportError(error, `Component: ${errorInfo.componentStack?.slice(0, 200)}`);
    },
    onUncaughtError: (error) => {
      reportError(error, 'Uncaught');
    },
    onRecoverableError: (error) => {
      reportError(error, 'Recoverable');
    },
  });
  
  root.render(
    <StrictMode>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <Toaster position="bottom-center" richColors closeButton expand={false} visibleToasts={2} swipeDirections={['left', 'right']} />
        <TaskProvider>
          <App />
          <Analytics />
        </TaskProvider>
      </PersistQueryClientProvider>
    </StrictMode>
  );

  // v2.11.1: 平滑淡出並移除啟動骨架屏 [PERCEIVED-PERFORMANCE-IMPROVED]
  setTimeout(() => {
    const skeleton = document.getElementById('app-startup-skeleton');
    if (skeleton) {
      skeleton.style.opacity = '0';
      setTimeout(() => {
        skeleton.remove();
      }, 300);
    }
  }, 50);
}
