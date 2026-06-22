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
import { QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { queryClient } from './lib/queryClient';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { FatalErrorOverlay } from '@/components/shared/FatalErrorOverlay';
import { PortalRoot } from '@/components/ui/PortalRoot';
import { logger } from './lib/logger';
import './index.css';
import { clientEnv } from './shared/envSchema';
// Removed migration
import { initChunkHandler } from '@/lib/chunkErrorHandler';
import { dailyWorker } from '@/features/diagnostics/DailyWorker';
import { useUI, storeAccessor } from '@/lib/store';
import { scheduler } from '@/lib/task-queue/scheduler';
import { setupQuerySync } from '@/lib/task-queue/querySync';

async function init() {
  // No migration
  
  // 初始化 Task Queue
  const cleanupQuerySync = setupQuerySync();
  scheduler.restore().catch(console.error);

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      const reason = event.reason;
      const message = reason?.message || String(reason || '');
      const isCancellation = 
        reason?.name === 'AbortError' || 
        /cancel|abort|precondition|offline|websocket|websocket|hmr|chunk|module script|dynamically imported/i.test(message) ||
        /ResizeObserver/i.test(message) ||
        message.includes('DOMException') ||
        message.includes('user_cancel') ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError');
        
      if (isCancellation) return;
      
      // 同步到全域診斷陣列
      type StartupError = { msg: string; type: string; details: string };
      const w = window as unknown as { __STARTUP_ERRORS__?: StartupError[] };
      const errors = w.__STARTUP_ERRORS__ || [];
      errors.push({
        msg: message,
        type: '非同步拒絕異常 (React Unhandled Promise)',
        details: reason?.stack || '位置: React App runtime'
      });
      w.__STARTUP_ERRORS__ = errors;

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

      // 同步到全域診斷陣列
      type StartupError = { msg: string; type: string; details: string };
      const w = window as unknown as { __STARTUP_ERRORS__?: StartupError[] };
      const errors = w.__STARTUP_ERRORS__ || [];
      errors.push({
        msg: message,
        type: '運行期異常 (React Runtime Error)',
        details: event.error?.stack || '位置: React App index'
      });
      w.__STARTUP_ERRORS__ = errors;

      ErrorFactory.capture(event.error || new Error(event.message || '全局运行时错误'));
    });
  }

  if (clientEnv.DEV) {
    await import('@/lib/resizeObserverPolyfill');
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
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <App />
            <FatalErrorOverlay />
            <Analytics />
            <PortalRoot />
          </ErrorBoundary>
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
