
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

  const originalConsoleWarn = console.warn;
  console.warn = function (...args: unknown[]) {
    if (
      typeof args[0] === 'string' && 
      (args[0].includes("[Virtua]") || args[0].includes("oversize") || args[0].includes("Oversize"))
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args as unknown as Parameters<typeof originalConsoleWarn>);
  };
}


import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { Router } from 'wouter';
import App from './App.js';
import { queryClient, asyncPersister } from '#src/lib/query/index.js';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ErrorFactory } from './lib/error/ErrorFactory.js';
import { ErrorBoundary } from './components/shared/ErrorBoundary.js';
import { FatalErrorOverlay } from './components/shared/FatalErrorOverlay.js';
import { logger } from './lib/logger.js';
import './index.css';
// Removed import
// Removed migration
import { initChunkHandler } from './lib/chunkErrorHandler.js';
import { dailyWorker } from './features/diagnostics/DailyWorker.js';
import { useUI, storeAccessor } from './lib/store/index.js';
import { scheduler } from './lib/task-queue/scheduler.js';
import { setupQuerySync } from './lib/task-queue/querySync.js';

async function init() {
  // No migration
  
  // 初始化 Task Queue
  const cleanupQuerySync = setupQuerySync();
  // scheduler.restore() 已移動到 appStore.ts 初始化邏輯中

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason?.message || String(reason || '');
      const isChunkError = /chunk|dynamically imported|module script/i.test(message);
      
      // If it's a chunk error, let the specialized handler (initChunkHandler) take over.
      // Do NOT call preventDefault here yet to allow other listeners to see it.
      if (isChunkError) return;

      event.preventDefault();
      const isCancellation = 
        reason?.name === 'AbortError' || 
        /cancel|abort|precondition|offline|websocket|websocket|hmr/i.test(message) ||
        /ResizeObserver/i.test(message) ||
        message.includes('DOMException') ||
        message.includes('user_cancel') ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError');
        
      if (isCancellation) return;
      
      ErrorFactory.capture(reason || new Error(message || 'Unhandled Promise Rejection'));
    });

    window.addEventListener('error', (event) => {
      const message = event.message || event.error?.message || '';
      const isNoise = 
        /ResizeObserver/i.test(message) || 
        /chunk|dynamically imported|module script/i.test(message) ||
        /AbortError/i.test(message) ||
        /cancel|abort|precondition|offline|websocket|hmr/i.test(message) ||
        message.includes('DOMException') ||
        message.includes('user_cancel') ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError');

      if (isNoise) return;

      ErrorFactory.capture(event.error || new Error(event.message || 'Global runtime error'));
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    await import('./lib/resizeObserverPolyfill.js');
  }

  // 啟動每日維護 (P0: Robustness)
  dailyWorker.checkAndRun();
  initChunkHandler();

  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container, {
      onCaughtError: (error, errorInfo) => {
        const message = (error as Error)?.message || String(error || '');
        if (/chunk|dynamically imported|module script|ResizeObserver/i.test(message)) return;
        // Caught errors are handled locally by error boundaries. Log but do not trigger global crash screen.
        ErrorFactory.capture(error);
      },
      onUncaughtError: (error) => {
        const message = (error as Error)?.message || String(error || '');
        const isNoise = 
          /chunk|dynamically imported|module script|ResizeObserver/i.test(message) ||
          /AbortError/i.test(message) ||
          /cancel|abort|precondition|offline|websocket|hmr/i.test(message) ||
          message.includes('DOMException') ||
          message.includes('user_cancel') ||
          message.includes('Failed to fetch') ||
          message.includes('NetworkError');

        if (isNoise) {
          return;
        }
        
        storeAccessor.ui.setFatalError(error instanceof Error ? error : new Error(String(error)));
      },
      onRecoverableError: (error) => {
        if (/chunk|dynamically imported|module script|ResizeObserver/i.test((error as Error)?.message || '')) return;
        // ignore recoverable
      },
    });
    
    root.render(
      <StrictMode>
        <PersistQueryClientProvider 
          client={queryClient}
          persistOptions={{
            persister: asyncPersister,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
          }}
        >
          <NuqsAdapter>
            <Router>
              <ErrorBoundary>
                <App />
                <FatalErrorOverlay />
                <Analytics />
              </ErrorBoundary>
            </Router>
          </NuqsAdapter>
        </PersistQueryClientProvider>
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
