// Polyfill process for libraries that expect it (like ArkType)
if (typeof window !== 'undefined' && (typeof (window as unknown as { process: unknown }).process === 'undefined' || (window as unknown as { process: unknown }).process === null)) {
  (window as unknown as { process: unknown }).process = { env: { NODE_ENV: 'development' } };
}

// Gracefully filter out the React 19 warning for empty string passed to the boolean attribute 'inert'
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = function (...args: unknown[]) {
    if (
      typeof args[0] === 'string' && 
      args[0].includes("Received an empty string for a boolean attribute") && 
      args.some(arg => typeof arg === 'string' && arg.includes("inert"))
    ) {
      return;
    }
    originalConsoleError.apply(console, args as unknown as Parameters<typeof originalConsoleError>);
  };
}


import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import * as Sentry from "@sentry/react";
import { TaskProvider } from '@/hooks';
import { logError } from './lib/error/errorReporter';
import { queryClient } from './lib/queryClient';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { FatalErrorOverlay } from '@/components/shared/FatalErrorOverlay';
import { logger } from './lib/logger';
import './index.css';
import { clientEnv } from './shared/envSchema';
// Removed migration
import { router } from './router/index';
import { initChunkHandler } from '@/lib/chunkErrorHandler';
import { dailyWorker } from '@/features/diagnostics/DailyWorker';
import { useUIStore } from '@/store/useUIStore';

logger.debug('[Sentry Initialization check] VITE_SENTRY_DSN:', import.meta.env.VITE_SENTRY_DSN, 'clientEnv:', clientEnv.VITE_SENTRY_DSN);

if (clientEnv.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: clientEnv.VITE_SENTRY_DSN,
    environment: clientEnv.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // 正式環境降低採樣率以優化效能，開發環境保持 1.0 以利除錯
    tracesSampleRate: clientEnv.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // 處理深層物件與循環引用
    normalizeDepth: 3,

    // 初始標籤
    initialScope: {
      tags: {
        app: "photox",
        platform: "web",
      },
    },

    // 可以在這裡過濾或處理麵包屑，防止循環引用導致的錯誤
    beforeBreadcrumb(breadcrumb) {
      // 確保 breadcrumb 中的資料不會導致序列化問題
      if (breadcrumb.data && typeof breadcrumb.data === 'object') {
        const data = breadcrumb.data as Record<string, unknown>;
        // 移除可能導致循環引用的已知大物件
        if (data.window || data.document || data.event || (data.statusText && data.url)) {
          return {
            ...breadcrumb,
            data: { _info: 'Large/Circular data stripped' }
          };
        }
      }
      return breadcrumb;
    },

    // 忽略特定的網路雜訊
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection captured',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'Load failed',
    ],

    // 關閉除錯模式以避免內部日誌引發循環引用報錯
    debug: false,
  });

  // Expose Sentry to window for in-browser debugging
  interface CustomWindow extends Window {
    Sentry?: typeof Sentry;
  }
  (window as unknown as CustomWindow).Sentry = Sentry;
  logger.info('🚀 [Sentry Initialization] Sentry successfully initialized and bound to window.Sentry.');
} else {
  logger.info('⚠️ [Sentry Initialization] Sentry skipped initialization because VITE_SENTRY_DSN is empty.');
}

async function init() {
  // No migration
  initChunkHandler(router);

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      const reason = event.reason;
      const message = reason?.message || String(reason || '');
      const isCancellation = 
        reason?.name === 'AbortError' || 
        /cancel|abort|precondition|offline|websocket|websocket|hmr|chunk|module script|dynamically imported/i.test(message) ||
        message.includes('DOMException') ||
        message.includes('user_cancel') ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError');
        
      if (isCancellation) return;
      logError(reason || new Error(message || 'Unhandled Promise Rejection'), { action: 'Unhandled Rejection', component: 'Global', kind: 'UNKNOWN' });
    });

    window.addEventListener('error', (event) => {
      logError(event.error || new Error(event.message || '全局运行时错误'), { action: 'Runtime Error', component: 'Global', kind: 'UNKNOWN' });
    });
  }

  if (clientEnv.DEV) {
    await import('@/lib/resizeObserverPolyfill');
  }

  // 啟動每日維護 (P0: Robustness)
  dailyWorker.checkAndRun();

  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container, {
      onCaughtError: (error, errorInfo) => {
        if (/chunk|dynamically imported|module script/i.test((error as Error)?.message || '')) return;
        useUIStore.getState().setFatalError(error instanceof Error ? error : new Error(String(error)));
      },
      onUncaughtError: (error) => {
        if (/chunk|dynamically imported|module script/i.test((error as Error)?.message || '')) return;
        useUIStore.getState().setFatalError(error instanceof Error ? error : new Error(String(error)));
      },
      onRecoverableError: (error) => {
        if (/chunk|dynamically imported|module script/i.test((error as Error)?.message || '')) return;
        // ignore recoverable
      },
    });
    
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <Toaster position="bottom-center" richColors closeButton expand={false} visibleToasts={2} swipeDirections={['left', 'right']} />
          <TaskProvider>
            <ErrorBoundary>
              <App />
              <FatalErrorOverlay />
              <Analytics />
            </ErrorBoundary>
          </TaskProvider>
        </QueryClientProvider>
      </StrictMode>
    );

    // 移除启动骨架屏逻辑，改由 LoadingScreen 控制
  }
}

init().catch(err => {
  console.error("Critical error in main init()", err);
  const el = document.getElementById("root");
  if (el) el.innerHTML = `<div style="padding: 20px; color: red;">Startup Error: ${err.message}</div>`;
});
