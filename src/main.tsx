import { createStaleTime } from '@/shared/freshnessSchema';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as ErrorMonitor from "@sentry/react";
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { TaskProvider } from '@/hooks';
import { setupGlobalErrorHandling } from './lib/errorHandling';
import { ErrorReporter } from './lib/errorReporter';
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

ErrorMonitor.init({
  dsn: "https://5056f30974504ff1becd3b5da98a68af@app.glitchtip.com/23689",
  environment: clientEnv.MODE || 'development',
  tracesSampleRate: 1.0,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: createStaleTime('STABLE'),   // 5 分钟内不重新请求
      refetchOnMount: false,       // 组件挂载时不自动刷新
      refetchOnWindowFocus: false, // 切换 tab 不刷新
      retry: 1,
    },
  },
});

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Toaster position="bottom-center" richColors closeButton expand={false} visibleToasts={2} />
        <TaskProvider>
          <App />
          <Analytics />
        </TaskProvider>
      </QueryClientProvider>
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
