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
import { logError } from './services/system/logService';
import { queryClient, persister } from './lib/queryClient';
import './index.css';
import { clientEnv } from './shared/envSchema';
import { migrateStorage } from './services/system/storageService';

async function init() {
  // 一次性清理髒數據 (P0: Hygiene)
  await migrateStorage();

  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      const reason = event.reason;
      const message = reason?.message || String(reason || '');
      const isCancellation = 
        reason?.name === 'AbortError' || 
        /cancel|abort|precondition|offline|websocket|websocket|hmr/i.test(message) ||
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
  const { dailyWorker } = await import('./services/maintenance/DailyWorker');
  dailyWorker.checkAndRun();

  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container, {
      onCaughtError: (error, errorInfo) => {
        logError(error, { action: 'React Caught Error', component: errorInfo.componentStack?.slice(0, 200) || 'Unknown', kind: 'UNKNOWN' });
      },
      onUncaughtError: (error) => {
        logError(error, { action: 'React Uncaught Error', component: 'Root', kind: 'UNKNOWN' });
      },
      onRecoverableError: (error) => {
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
