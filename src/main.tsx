import { createStaleTime } from '@/shared/freshnessSchema';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import { TaskProvider } from '@/hooks';
import { logError } from './lib/error/errorLogger';
import { queryClient, persister } from './lib/queryClient';
import './index.css';
import { clientEnv } from './shared/envSchema';

if (clientEnv.DEV) {
  import('./lib/resizeObserverPolyfill');
}

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
    
  if (isCancellation) {
    if (clientEnv.DEV) console.warn('[Global] 捕获良性后台任务取消:', message);
    return;
  }
  logError(reason || new Error(message || 'Unhandled Promise Rejection'), { action: 'Unhandled Rejection', component: 'Global', kind: 'UNKNOWN' });
});

window.addEventListener('error', (event) => {
  logError(event.error || new Error(event.message || '全局运行时错误'), { action: 'Runtime Error', component: 'Global', kind: 'UNKNOWN' });
});

// 啟動每日維護 (P0: Robustness)
import { dailyWorker } from './services/maintenance/DailyWorker';
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
