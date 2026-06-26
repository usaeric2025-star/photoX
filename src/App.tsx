import { Suspense } from 'react';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterOrchestrator } from '@/components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useAppInit } from '@/hooks/core/useAppInit';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useRouteSync } from '@/hooks/core/useRouteSync';
import { DialogContainer } from '@/components/layout/DialogContainer';

export default function App() {
  const { status, error } = useAppInit();

  // ✅ 路由同步
  useRouteSync();

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        {status === 'loading' ? (
          <div className="fixed inset-0 z-50 animate-fade-in">
            <LoadingScreen />
          </div>
        ) : status === 'error' ? (
          <div className="fixed inset-0 z-50 animate-fade-in">
            <LoadingScreen error={error} />
          </div>
        ) : (
          <div className="relative min-h-screen animate-fade-in">
            <Suspense fallback={<LoadingScreen />}>
              <RouterOrchestrator />
            </Suspense>
          </div>
        )}
      </ConfirmProvider>
      <DialogContainer />
      <Analytics />
    </AppErrorBoundary>
  );
}

