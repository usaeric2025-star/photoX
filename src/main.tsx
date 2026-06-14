import { dailyWorker } from './services/maintenance/DailyWorker';
import { createStaleTime } from '@/shared/freshnessSchema';
import React, { StrictMode } from 'react';

// Polyfill process for libraries that expect it (like ArkType)
if (typeof window !== 'undefined' && (typeof (window as any).process === 'undefined' || (window as any).process === null)) {
  (window as any).process = { env: { NODE_ENV: 'development' } };
}

import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { TaskProvider } from '@/hooks';
import { logError } from './lib/error/errorReporter';
import { queryClient, persister } from './lib/queryClient';
import './index.css';
import { clientEnv } from './shared/envSchema';
import { migrateStorage } from './services/system/storageService';
import { router } from './router/index';
import { initChunkHandler } from '@/lib/chunkErrorHandler';

async function init() {
  // Gracefully filter out the React 19 warning for empty string passed to the boolean attribute 'inert' (usually from 3rd party UI libraries)
  if (typeof window !== 'undefined') {
    const originalConsoleError = console.error;
    console.error = function (...args: any[]) {
      if (typeof args[0] === 'string' && args[0].includes("Received an empty string for a boolean attribute") && args[0].includes("inert")) {
        return;
      }
      originalConsoleError.apply(console, args);
    };
  }

  // 一次性清理髒數據 (P0: Hygiene)
  await migrateStorage();

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
        logError(error, { action: 'React Caught Error', component: errorInfo.componentStack?.slice(0, 200) || 'Unknown', kind: 'UNKNOWN' });
      },
      onUncaughtError: (error) => {
        if (/chunk|dynamically imported|module script/i.test((error as Error)?.message || '')) return;
        logError(error, { action: 'React Uncaught Error', component: 'Root', kind: 'UNKNOWN' });
      },
      onRecoverableError: (error) => {
        if (/chunk|dynamically imported|module script/i.test((error as Error)?.message || '')) return;
        logError(error, { action: 'React Recoverable Error', component: 'Root', kind: 'UNKNOWN' });
      },
    });
    
    root.render(
      <StrictMode>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
          <Toaster style={{ zIndex: 'var(--z-toast, 500)' } as any} position="bottom-center" richColors closeButton expand={false} visibleToasts={2} swipeDirections={['left', 'right']} />
          <TaskProvider>
            <App />
            <Analytics />
          </TaskProvider>
        </PersistQueryClientProvider>
      </StrictMode>
    );

    // 移除启动骨架屏逻辑，改由 LoadingScreen 控制
  }
}

init();
