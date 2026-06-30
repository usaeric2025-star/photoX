import { Suspense, lazy } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { motion } from 'lite-sleek';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary';
import { ConfirmProvider } from './context/ConfirmContext';
import { RouterOrchestrator } from './components/RouterOrchestrator';
import { Analytics } from '@vercel/analytics/react';
import { useAppInit } from './hooks/core/useAppInit';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { DialogContainer } from './components/layout/DialogContainer';
import { Toaster } from 'sonner';
import { PhotoEditDialog } from './features/photo-edit/PhotoEditDialog';
import { SelectionSync } from './features/selection';

function AppContent({ status, error }: { status: string, error: Error | null }) {
  return (
    <AppErrorBoundary>
      <ConfirmProvider>
          <SelectionSync />
          {status === 'loading' ? (
            <LoadingScreen />
          ) : status === 'error' ? (
            <LoadingScreen error={error} />
          ) : (
            <motion.div 
              variant="fade"
              transition="easeOut"
              className="relative min-h-screen"
            >
              <Suspense fallback={<LoadingScreen />}>
                <RouterOrchestrator />
              </Suspense>
            </motion.div>
          )}
      </ConfirmProvider>
      <DialogContainer />
      <Toaster position="bottom-center" closeButton />
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

