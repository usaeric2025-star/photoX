
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
import { useUI, setFatalError } from './lib/store/index.js';
import { scheduler } from './lib/task-queue/scheduler.js';
import { setupQuerySync } from './lib/task-queue/querySync.js';

async function init() {
  setupQuerySync();

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason?.message || String(reason || '');
      if (/chunk|dynamically imported|module script/i.test(message)) return;
      event.preventDefault();
      if (/AbortError|cancel|abort|precondition|offline|websocket|hmr|ResizeObserver|DOMException|user_cancel|Failed to fetch|NetworkError/i.test(message)) return;
      ErrorFactory.capture(reason || new Error(message || 'Unhandled Promise Rejection'));
    });

    window.addEventListener('error', (event) => {
      const message = event.message || event.error?.message || '';
      if (/ResizeObserver|chunk|dynamically imported|module script|AbortError|cancel|abort|precondition|offline|websocket|hmr|DOMException|user_cancel|Failed to fetch|NetworkError/i.test(message)) return;
      ErrorFactory.capture(event.error || new Error(event.message || 'Global runtime error'));
    });
  }

  // 異步加載輔助模組，不阻塞主渲染 (P0: 提高 FCP)
  import('./lib/resizeObserverPolyfill.js').catch(e => console.warn("RO Polyfill load failed", e));
  
  // 啟動背景 Worker
  setTimeout(() => {
    try {
      dailyWorker.checkAndRun();
      initChunkHandler();
    } catch (e) {
      console.warn("Background workers init failed", e);
    }
  }, 1000);

  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container, {
      onCaughtError: (error) => {
        if (/chunk|dynamically imported|module script|ResizeObserver/i.test((error as Error)?.message || '')) return;
        ErrorFactory.capture(error);
      },
      onUncaughtError: (error) => {
        const message = (error as Error)?.message || String(error || '');
        if (/chunk|dynamically imported|module script|ResizeObserver|AbortError|cancel|abort|precondition|offline|websocket|hmr|DOMException|user_cancel|Failed to fetch|NetworkError/i.test(message)) return;
        setFatalError(error instanceof Error ? error : new Error(String(error)));
      },
    });
    
    root.render(
      <StrictMode>
        <PersistQueryClientProvider 
          client={queryClient}
          persistOptions={{
            persister: asyncPersister,
            maxAge: 1000 * 60 * 60 * 24 * 7,
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
  }
}

init().catch(err => {
  console.error("Critical error in main init()", err);
  const el = document.getElementById("root");
  if (el) el.innerHTML = `<div style="padding: 20px; color: red;">Startup Error: ${err.message}</div>`;
});
