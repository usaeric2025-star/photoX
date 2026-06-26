import { Suspense, lazy } from 'react';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterOrchestrator } from '@/components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useAppInit } from '@/hooks/core/useAppInit';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useRouteSync } from '@/hooks/core/useRouteSync';
import { DialogContainer } from '@/components/layout/DialogContainer';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';

const DiagDialog = lazy(() => import('@/components/ui/DiagDialog').then(m => ({ default: m.DiagDialog })));

export default function App() {
  const { status, error } = useAppInit();

  // ✅ 路由同步
  useRouteSync();

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        {status === 'loading' ? (
          <LoadingScreen />
        ) : status === 'error' ? (
          <LoadingScreen error={error} />
        ) : (
          <div className="relative min-h-screen animate-fade-in">
            <Suspense fallback={<LoadingScreen />}>
              <RouterOrchestrator />
            </Suspense>
          </div>
        )}
      </ConfirmProvider>
      <DialogContainer />
      <PhotoEditDialog />
      <Suspense fallback={null}>
        <DiagDialog />
      </Suspense>
      <Analytics />
    </AppErrorBoundary>
  );
}

