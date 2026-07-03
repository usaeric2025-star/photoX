import { Suspense, lazy } from 'react';
import { motion } from 'lite-sleek';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary.js';
import { ConfirmProvider } from './context/ConfirmContext.js';
import { RouterOrchestrator } from './components/RouterOrchestrator.js';
import { useAppInit } from './hooks/core/useAppInit.js';
import { LoadingScreen } from './components/ui/LoadingScreen.js';
import { DialogContainer } from './components/layout/DialogContainer.js';
import { Toaster } from 'sonner';
import { TaskIndicator } from './components/admin/TaskIndicator.js';

function AppContent({ status, error }: { status: string, error: Error | null }) {
  return (
    <AppErrorBoundary>
      <ConfirmProvider>
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
      <TaskIndicator />
      <Toaster position="bottom-center" closeButton />
    </AppErrorBoundary>
  );
}

export default function App() {
  const { status, error } = useAppInit();

  return (
    <AppContent status={status} error={error} />
  );
}

