import { Suspense, lazy } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { SelectionProvider } from '@/features/selection';
import { RouterOrchestrator } from '@/components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useAppInit } from '@/hooks/core/useAppInit';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useURLSync } from '@/hooks/core/useURLSync';
import { DialogContainer } from '@/components/layout/DialogContainer';
import { PhotoEditDialog } from '@/features/photo-edit/PhotoEditDialog';

const DiagDialog = lazy(() => import('@/components/ui/DiagDialog').then(m => ({ default: m.DiagDialog })));

function AppContent({ status, error }: { status: string, error: Error | null }) {
  // ✅ 路由同步 (using nuqs)
  useURLSync();

  return (
    <AppErrorBoundary>
      <ConfirmProvider>
        <SelectionProvider>
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
        </SelectionProvider>
      </ConfirmProvider>
      <DialogContainer />
      <Suspense fallback={null}>
        <DiagDialog />
      </Suspense>
      <Analytics />
    </AppErrorBoundary>
  );
}

export default function App() {
  const { status, error } = useAppInit();

  return (
    <NuqsAdapter>
      <AppContent status={status} error={error} />
    </NuqsAdapter>
  );
}

